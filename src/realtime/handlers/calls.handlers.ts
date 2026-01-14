import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket.types";

import {
  createCall,
  endCall,
  getCall,
  getInCall,
  updateCall,
} from "../calls/calls.store";

const sessionNs = (sid: string) => `session:${sid}`;

const CALL_RING_TTL = 90; // seconds: if not accepted, auto end
const CALL_ACTIVE_TTL = 60 * 30; // 30 min

export function bindCallHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  // start call => ring callee
  socket.on("call:start", async ({ targetSessionId, roomId }, cb) => {
    try {
      const me = socket.data.sessionId;

      if (!targetSessionId || targetSessionId === me) {
        return cb?.({ ok: false, error: "INVALID_TARGET" });
      }

      // busy checks
      const meIn = await getInCall(me);
      if (meIn) return cb?.({ ok: false, error: "CALLER_BUSY", callId: meIn });

      const targetIn = await getInCall(targetSessionId);
      if (targetIn) {
        io.to(sessionNs(me)).emit("call:busy", { targetSessionId });
        return cb?.({ ok: false, error: "TARGET_BUSY" });
      }

      const call = await createCall({
        fromSessionId: me,
        toSessionId: targetSessionId,
        roomId: roomId ?? null,
        ttlSeconds: CALL_RING_TTL,
      });

      // ring on callee personal namespace
      io.to(sessionNs(targetSessionId)).emit("call:ring", {
        callId: call.id,
        fromSessionId: me,
        roomId: call.roomId,
      });

      cb?.({ ok: true, callId: call.id });

      // server-side timeout (best-effort)
      setTimeout(async () => {
        const cur = await getCall(call.id);
        if (!cur) return;
        if (cur.status === "RINGING") {
          await endCall({
            callId: call.id,
            bySessionId: null,
            reason: "TIMEOUT",
            ttlSeconds: 60,
          });
          io.to(sessionNs(cur.fromSessionId)).emit("call:ended", {
            callId: call.id,
            reason: "TIMEOUT",
            bySessionId: null,
          });
          io.to(sessionNs(cur.toSessionId)).emit("call:ended", {
            callId: call.id,
            reason: "TIMEOUT",
            bySessionId: null,
          });
        }
      }, (CALL_RING_TTL + 2) * 1000);
    } catch {
      cb?.({ ok: false, error: "CALL_START_FAILED" });
    }
  });

  // accept => becomes ACTIVE
  socket.on("call:accept", async ({ callId }, cb) => {
    try {
      const me = socket.data.sessionId;

      const call = await getCall(callId);
      if (!call) return cb?.({ ok: false, error: "CALL_NOT_FOUND" });

      if (call.toSessionId !== me)
        return cb?.({ ok: false, error: "FORBIDDEN" });
      if (call.status !== "RINGING")
        return cb?.({ ok: false, error: "NOT_RINGING" });

      const updated = await updateCall(
        callId,
        { status: "ACTIVE", acceptedAt: new Date().toISOString() },
        CALL_ACTIVE_TTL
      );

      io.to(sessionNs(call.fromSessionId)).emit("call:accepted", {
        callId,
        bySessionId: me,
      });

      cb?.({ ok: true, call: updated });
    } catch {
      cb?.({ ok: false, error: "CALL_ACCEPT_FAILED" });
    }
  });

  // offer => forward to other party
  socket.on("call:offer", async ({ callId, sdp }, cb) => {
    try {
      const me = socket.data.sessionId;
      const call = await getCall(callId);
      if (!call) return cb?.({ ok: false, error: "CALL_NOT_FOUND" });

      const other =
        call.fromSessionId === me
          ? call.toSessionId
          : call.toSessionId === me
          ? call.fromSessionId
          : null;

      if (!other) return cb?.({ ok: false, error: "FORBIDDEN" });
      if (call.status === "ENDED")
        return cb?.({ ok: false, error: "CALL_ENDED" });

      io.to(sessionNs(other)).emit("call:offer", { callId, sdp });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "OFFER_FAILED" });
    }
  });

  socket.on("call:answer", async ({ callId, sdp }, cb) => {
    try {
      const me = socket.data.sessionId;
      const call = await getCall(callId);
      if (!call) return cb?.({ ok: false, error: "CALL_NOT_FOUND" });

      const other =
        call.fromSessionId === me
          ? call.toSessionId
          : call.toSessionId === me
          ? call.fromSessionId
          : null;

      if (!other) return cb?.({ ok: false, error: "FORBIDDEN" });
      if (call.status === "ENDED")
        return cb?.({ ok: false, error: "CALL_ENDED" });

      io.to(sessionNs(other)).emit("call:answer", { callId, sdp });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "ANSWER_FAILED" });
    }
  });

  socket.on("call:ice", async ({ callId, candidate }, cb) => {
    try {
      const me = socket.data.sessionId;
      const call = await getCall(callId);
      if (!call) return cb?.({ ok: false, error: "CALL_NOT_FOUND" });

      const other =
        call.fromSessionId === me
          ? call.toSessionId
          : call.toSessionId === me
          ? call.fromSessionId
          : null;

      if (!other) return cb?.({ ok: false, error: "FORBIDDEN" });
      if (call.status === "ENDED")
        return cb?.({ ok: false, error: "CALL_ENDED" });

      io.to(sessionNs(other)).emit("call:ice", { callId, candidate });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "ICE_FAILED" });
    }
  });

  socket.on("call:end", async ({ callId, reason }, cb) => {
    try {
      const me = socket.data.sessionId;
      const call = await getCall(callId);
      if (!call) return cb?.({ ok: false, error: "CALL_NOT_FOUND" });

      const allowed = call.fromSessionId === me || call.toSessionId === me;
      if (!allowed) return cb?.({ ok: false, error: "FORBIDDEN" });

      const ended = await endCall({
        callId,
        bySessionId: me,
        reason: reason || "ENDED",
        ttlSeconds: 60,
      });

      io.to(sessionNs(call.fromSessionId)).emit("call:ended", {
        callId,
        reason: reason || "ENDED",
        bySessionId: me,
      });
      io.to(sessionNs(call.toSessionId)).emit("call:ended", {
        callId,
        reason: reason || "ENDED",
        bySessionId: me,
      });

      cb?.({ ok: true, call: ended });
    } catch {
      cb?.({ ok: false, error: "CALL_END_FAILED" });
    }
  });
}
