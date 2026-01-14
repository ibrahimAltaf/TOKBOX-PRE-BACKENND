import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket.types";

import {
  addToRoomPresence,
  cleanupSessionPresence,
  listRoomPresence,
  removeFromRoomPresence,
} from "../presence/presence.store";

import {
  joinRoom,
  leaveRoom,
} from "../../modules/rooms/service/roomMembers.service";
import { closeRoomIfOwnerLeft } from "../../modules/rooms/service/rooms.service";

const roomNamespace = (roomId: string) => `room:${roomId}`;
const sessionNamespace = (sessionId: string) => `session:${sessionId}`;

async function emitPresence(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  roomId: string
) {
  const sessionIds = await listRoomPresence(roomId);
  io.to(roomNamespace(roomId)).emit("presence:update", {
    roomId,
    sessionIds,
  });
}

export function bindRoomHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  socket.on("room:join", async ({ roomId }, cb) => {
    try {
      const meSessionId = socket.data.sessionId;

      // ✅ DB rules: ban/maxUsers/owner
      const out = await joinRoom({ roomId, sessionId: meSessionId });
      if (!out.ok) return cb?.({ ok: false, error: out.error });

      socket.join(roomNamespace(roomId));
      await addToRoomPresence(roomId, meSessionId);

      await emitPresence(io, roomId);

      cb?.({ ok: true, role: out.role });
    } catch {
      cb?.({ ok: false, error: "JOIN_FAILED" });
    }
  });

  socket.on("room:leave", async ({ roomId }, cb) => {
    try {
      const meSessionId = socket.data.sessionId;

      await leaveRoom({ roomId, sessionId: meSessionId });

      socket.leave(roomNamespace(roomId));
      await removeFromRoomPresence(roomId, meSessionId);

      // ✅ Owner leaves => close room
      const closeOut = await closeRoomIfOwnerLeft({
        roomId,
        leavingSessionId: meSessionId,
      });

      if (closeOut.ok && closeOut.closed) {
        // notify + clear remaining presence
        const sessionIds = await listRoomPresence(roomId);
        for (const sid of sessionIds) {
          await removeFromRoomPresence(roomId, sid);
          io.to(sessionNamespace(sid)).emit("room:closed", {
            roomId,
            bySessionId: meSessionId,
          });
        }

        io.to(roomNamespace(roomId)).emit("room:closed", {
          roomId,
          bySessionId: meSessionId,
        });
      }

      await emitPresence(io, roomId);
      cb?.({ ok: true, closed: closeOut.ok ? closeOut.closed : false });
    } catch {
      cb?.({ ok: false, error: "LEAVE_FAILED" });
    }
  });

  socket.on("disconnect", async () => {
    const meSessionId = socket.data.sessionId;

    // rooms where user was present
    const rooms = await cleanupSessionPresence(meSessionId);

    for (const roomId of rooms) {
      try {
        await leaveRoom({ roomId, sessionId: meSessionId });

        const closeOut = await closeRoomIfOwnerLeft({
          roomId,
          leavingSessionId: meSessionId,
        });

        if (closeOut.ok && closeOut.closed) {
          const sessionIds = await listRoomPresence(roomId);
          for (const sid of sessionIds) {
            await removeFromRoomPresence(roomId, sid);
            io.to(sessionNamespace(sid)).emit("room:closed", {
              roomId,
              bySessionId: meSessionId,
            });
          }

          io.to(roomNamespace(roomId)).emit("room:closed", {
            roomId,
            bySessionId: meSessionId,
          });
        }

        await emitPresence(io, roomId);
      } catch {
        // ignore disconnect cleanup errors
      }
    }
  });
}
