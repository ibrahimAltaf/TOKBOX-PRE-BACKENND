import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket.types";

import {
  addMember,
  endVideoGroup,
  getVideoGroup,
  listMembers,
  memberCount,
  removeMember,
  setVideoGroup,
  type VideoGroupState,
} from "../videoGroup/videoGroup.store";

import { getRoomById } from "../../modules/rooms/service/rooms.service";

const roomNs = (roomId: string) => `room:${roomId}`;
const sessionNs = (sid: string) => `session:${sid}`;

async function emitMembers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  roomId: string
) {
  const sessionIds = await listMembers(roomId);
  io.to(roomNs(roomId)).emit("vg:members", { roomId, sessionIds });
}

export function bindVideoGroupHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  socket.on("vg:start", async ({ roomId, maxUsers }, cb) => {
    try {
      const me = socket.data.sessionId;

      // room exists?
      const room = await getRoomById(roomId);
      if (!room) return cb?.({ ok: false, error: "ROOM_NOT_FOUND" });

      // only VIDEO_GROUP rooms are allowed (optional strict)
      if (room.type !== "VIDEO_GROUP") {
        return cb?.({ ok: false, error: "NOT_VIDEO_GROUP_ROOM" });
      }

      // create state if not exists
      const existing = await getVideoGroup(roomId);
      if (existing && existing.status === "ACTIVE") {
        return cb?.({ ok: true, state: existing });
      }

      const capRoom = Number(room.maxUsers ?? 0);
      const cap = Math.max(2, Math.min(50, Number(maxUsers ?? capRoom ?? 12) || 12));

      const state: VideoGroupState = {
        id: roomId,
        roomId,
        ownerSessionId: me,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        endedAt: null,
        maxUsers: cap,
      };

      await setVideoGroup(roomId, state, 60 * 60);

      // join socket room namespace (so members updates broadcast)
      socket.join(roomNs(roomId));

      // add starter as member
      await addMember(roomId, me);

      io.to(roomNs(roomId)).emit("vg:started", {
        roomId,
        ownerSessionId: me,
        maxUsers: cap,
      });

      await emitMembers(io, roomId);

      cb?.({ ok: true, state });
    } catch {
      cb?.({ ok: false, error: "VG_START_FAILED" });
    }
  });

  socket.on("vg:join", async ({ roomId }, cb) => {
    try {
      const me = socket.data.sessionId;

      const state = await getVideoGroup(roomId);
      if (!state || state.status !== "ACTIVE") {
        return cb?.({ ok: false, error: "VG_NOT_ACTIVE" });
      }

      // capacity check
      const count = await memberCount(roomId);
      if (count >= state.maxUsers) {
        return cb?.({ ok: false, error: "VG_FULL" });
      }

      socket.join(roomNs(roomId));
      await addMember(roomId, me);

      await emitMembers(io, roomId);

      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "VG_JOIN_FAILED" });
    }
  });

  socket.on("vg:leave", async ({ roomId }, cb) => {
    try {
      const me = socket.data.sessionId;

      socket.leave(roomNs(roomId));
      await removeMember(roomId, me);

      const state = await getVideoGroup(roomId);

      // if owner leaves => close
      if (state?.status === "ACTIVE" && state.ownerSessionId === me) {
        await endVideoGroup(roomId);

        io.to(roomNs(roomId)).emit("vg:closed", {
          roomId,
          reason: "OWNER_LEFT",
          bySessionId: me,
        });

        cb?.({ ok: true, closed: true });
        return;
      }

      await emitMembers(io, roomId);
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "VG_LEAVE_FAILED" });
    }
  });

  // Peer-to-peer signaling inside group:
  // Sender targets a specific member by sessionId (mesh style)
  socket.on("vg:offer", async ({ roomId, toSessionId, sdp }, cb) => {
    try {
      const me = socket.data.sessionId;
      io.to(sessionNs(toSessionId)).emit("vg:offer", {
        roomId,
        fromSessionId: me,
        sdp,
      });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "VG_OFFER_FAILED" });
    }
  });

  socket.on("vg:answer", async ({ roomId, toSessionId, sdp }, cb) => {
    try {
      const me = socket.data.sessionId;
      io.to(sessionNs(toSessionId)).emit("vg:answer", {
        roomId,
        fromSessionId: me,
        sdp,
      });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "VG_ANSWER_FAILED" });
    }
  });

  socket.on("vg:ice", async ({ roomId, toSessionId, candidate }, cb) => {
    try {
      const me = socket.data.sessionId;
      io.to(sessionNs(toSessionId)).emit("vg:ice", {
        roomId,
        fromSessionId: me,
        candidate,
      });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "VG_ICE_FAILED" });
    }
  });

  socket.on("vg:kick", async ({ roomId, targetSessionId }, cb) => {
    try {
      const me = socket.data.sessionId;

      const state = await getVideoGroup(roomId);
      if (!state || state.status !== "ACTIVE") {
        return cb?.({ ok: false, error: "VG_NOT_ACTIVE" });
      }

      if (state.ownerSessionId !== me) {
        return cb?.({ ok: false, error: "OWNER_ONLY" });
      }

      await removeMember(roomId, targetSessionId);

      io.to(sessionNs(targetSessionId)).emit("vg:kicked", {
        roomId,
        bySessionId: me,
      });

      await emitMembers(io, roomId);
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "VG_KICK_FAILED" });
    }
  });

  socket.on("vg:close", async ({ roomId, reason }, cb) => {
    try {
      const me = socket.data.sessionId;

      const state = await getVideoGroup(roomId);
      if (!state || state.status !== "ACTIVE") {
        return cb?.({ ok: false, error: "VG_NOT_ACTIVE" });
      }

      if (state.ownerSessionId !== me) {
        return cb?.({ ok: false, error: "OWNER_ONLY" });
      }

      await endVideoGroup(roomId);

      io.to(roomNs(roomId)).emit("vg:closed", {
        roomId,
        reason: reason || "CLOSED",
        bySessionId: me,
      });

      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "VG_CLOSE_FAILED" });
    }
  });

  // safety: if socket disconnects, remove from any active group rooms it was in
  socket.on("disconnect", async () => {
    // optional: no-op, because you already cleanup room presence elsewhere.
    // You can later track membership by session in redis if needed.
  });
}
