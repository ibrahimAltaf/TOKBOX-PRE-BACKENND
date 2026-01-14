import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket.types";
import {
  openThread,
  sendDmMessage,
  toDmMessageResponse,
  toThreadResponse,
} from "../../modules/dm/service/dm.service";

export function bindDmHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  socket.on("dm:open", async ({ targetSessionId }, cb) => {
    const out = await openThread({
      meSessionId: socket.data.sessionId,
      targetSessionId,
    });

    if (!out.ok) return cb?.({ ok: false, error: out.error });

    // Join both users into thread room for realtime
    const threadId = String((out.thread as any)._id ?? (out.thread as any).id);
    socket.join(`dm:${threadId}`);

    cb?.({
      ok: true,
      thread: toThreadResponse(out.thread, socket.data.sessionId),
    });
  });

  socket.on("dm:send", async ({ threadId, text, mediaUrls, mediaIds }, cb) => {
    const out = await sendDmMessage({
      meSessionId: socket.data.sessionId,
      threadId,
      text,
      mediaUrls,
      mediaIds,
    });

    if (!out.ok) return cb?.({ ok: false, error: out.error });

    const message = toDmMessageResponse(out.message);
    io.to(`dm:${threadId}`).emit("dm:new", { threadId, message });

    // Also push to both sessions personal channel (in case not joined to dm room)
    io.to(`session:${socket.data.sessionId}`).emit("dm:new", {
      threadId,
      message,
    });

    // If you want: resolve other participant and emit to their session room too (optional later)
    cb?.({ ok: true, message });
  });
}
