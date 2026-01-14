import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket.types";
import {
  createInvite,
  toInviteResponse,
} from "../../modules/invites/service/invites.service";

export function bindInviteHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  // Optional realtime helper: create invite via socket (REST also exists)
  // If you don't want socket endpoint, remove this.
  socket.on("invite:create" as any, async (payload: any, cb: any) => {
    const out = await createInvite({
      inviterSessionId: socket.data.sessionId,
      kind: payload.kind,
      roomId: payload.roomId,
      dmThreadId: payload.dmThreadId,
      targetSessionId: payload.targetSessionId,
      maxUses: payload.maxUses ?? 1,
      ttlMinutes: payload.ttlMinutes,
    });

    if (!out.ok) return cb?.({ ok: false, error: out.error });

    const invite = toInviteResponse(out.invite);

    // if internal invite => notify target user
    if (invite.targetSessionId) {
      io.to(`session:${invite.targetSessionId}`).emit("invite:new", { invite });
    }

    cb?.({ ok: true, invite });
  });
}
