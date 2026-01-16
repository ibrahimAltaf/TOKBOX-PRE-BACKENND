import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket.types";

import {
  createInvite,
  acceptInvite,
  revokeInvite,
  toInviteResponse,
} from "../../modules/invites/service/invites.service";

const sessionNs = (sid: string) => `session:${sid}`;

function inviteAction(inv: any) {
  // Frontend uses this to decide navigation + overlay
  // NOTE: keep consistent with your UI logic
  if (inv.kind === "DM") {
    return { type: "OPEN_DM", dmThreadId: inv.dmThreadId ? String(inv.dmThreadId) : null };
  }
  if (inv.kind === "ROOM") {
    return { type: "JOIN_ROOM", roomId: inv.roomId ? String(inv.roomId) : null };
  }
  if (inv.kind === "VIDEO_GROUP") {
    return { type: "JOIN_VIDEO_GROUP", roomId: inv.roomId ? String(inv.roomId) : null };
  }
  if (inv.kind === "VIDEO_1ON1") {
    return { type: "JOIN_VIDEO_1ON1", roomId: inv.roomId ? String(inv.roomId) : null };
  }
  return { type: "UNKNOWN" };
}

export function bindInviteHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  // Create invite (internal or external)
  socket.on("invite:create", async (payload, cb) => {
    try {
      const me = socket.data.sessionId;

      const out = await createInvite({
        inviterSessionId: me,
        kind: payload.kind,
        roomId: payload.roomId,
        dmThreadId: payload.dmThreadId,
        targetSessionId: payload.targetSessionId,
        maxUses: Number(payload.maxUses ?? 1) || 1,
        ttlMinutes: payload.ttlMinutes,
      });

      if (!out.ok) return cb?.(out);

      const inv = out.invite;
      const resp = toInviteResponse(inv);

      // ✅ internal targeted invite => real-time push into chatbox
      if (resp.targetSessionId) {
        io.to(sessionNs(resp.targetSessionId)).emit("invite:new", {
          invite: resp,
          action: inviteAction(resp),
        });
      }

      return cb?.({
        ok: true,
        invite: resp,
        action: inviteAction(resp),
        // frontend can show shareable link:
        // `${PUBLIC_BASE_URL}/i/${token}` (frontend route)
      });
    } catch {
      return cb?.({ ok: false, error: "INVITE_CREATE_FAILED" });
    }
  });

  // Accept invite (internal accept without opening external link)
  socket.on("invite:accept", async ({ token }, cb) => {
    try {
      const me = socket.data.sessionId;

      const out = await acceptInvite({ meSessionId: me, token });
      if (!out.ok) return cb?.(out);

      const inv = toInviteResponse(out.invite);

      // notify inviter
      io.to(sessionNs(inv.inviterSessionId)).emit("invite:accepted", {
        token: inv.token,
        kind: inv.kind,
        acceptedBySessionId: me,
      });

      return cb?.({
        ok: true,
        invite: inv,
        action: inviteAction(inv),
      });
    } catch {
      return cb?.({ ok: false, error: "INVITE_ACCEPT_FAILED" });
    }
  });

  // Revoke invite
  socket.on("invite:revoke", async ({ token }, cb) => {
    try {
      const me = socket.data.sessionId;

      const out = await revokeInvite({ meSessionId: me, token });
      if (!out.ok) return cb?.(out);

      const inv = toInviteResponse(out.invite);

      // notify targeted user (if any)
      if (inv.targetSessionId) {
        io.to(sessionNs(inv.targetSessionId)).emit("invite:revoked", {
          token: inv.token,
        });
      }

      return cb?.({ ok: true, invite: inv });
    } catch {
      return cb?.({ ok: false, error: "INVITE_REVOKE_FAILED" });
    }
  });
}
