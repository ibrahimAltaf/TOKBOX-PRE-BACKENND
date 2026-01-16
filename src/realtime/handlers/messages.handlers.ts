import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket.types";
import {
  sendRoomMessage,
  toMessageResponse,
} from "../../modules/messages/service/messages.service";

const roomNamespace = (roomId: string) => `room:${roomId}`;

export function bindMessageHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  socket.on("msg:send", async (payload, cb) => {
    try {
      const { roomId, text, mediaUrls, mediaIds } = payload;

      const out = await sendRoomMessage({
        roomId,
        senderSessionId: socket.data.sessionId,
        text,
        mediaUrls,
        mediaIds,
      });

      if (!out.ok) {
        cb?.({ ok: false, error: out.error });
        return;
      }

      const message = toMessageResponse(out.message);

      // ✅ Keep your existing emit shape (roomId + message)
      io.to(roomNamespace(roomId)).emit("msg:new", { roomId, message });

      cb?.({ ok: true, message });
    } catch (e: any) {
      cb?.({ ok: false, error: e?.message ?? "SEND_FAILED" });
    }
  });

  socket.on("typing:start", async ({ roomId }, cb) => {
    try {
      io.to(roomNamespace(roomId)).emit("typing:update", {
        roomId,
        sessionId: socket.data.sessionId,
        isTyping: true,
      });
      cb?.({ ok: true });
    } catch (e: any) {
      cb?.({ ok: false, error: e?.message ?? "TYPING_START_FAILED" });
    }
  });

  socket.on("typing:stop", async ({ roomId }, cb) => {
    try {
      io.to(roomNamespace(roomId)).emit("typing:update", {
        roomId,
        sessionId: socket.data.sessionId,
        isTyping: false,
      });
      cb?.({ ok: true });
    } catch (e: any) {
      cb?.({ ok: false, error: e?.message ?? "TYPING_STOP_FAILED" });
    }
  });
}
