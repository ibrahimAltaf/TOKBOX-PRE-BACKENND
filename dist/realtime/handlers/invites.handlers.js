"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindInviteHandlers = bindInviteHandlers;
const invites_service_1 = require("../../modules/invites/service/invites.service");
const sessionNs = (sid) => `session:${sid}`;
function inviteAction(inv) {
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
function bindInviteHandlers(io, socket) {
    // Create invite (internal or external)
    socket.on("invite:create", async (payload, cb) => {
        try {
            const me = socket.data.sessionId;
            const out = await (0, invites_service_1.createInvite)({
                inviterSessionId: me,
                kind: payload.kind,
                roomId: payload.roomId,
                dmThreadId: payload.dmThreadId,
                targetSessionId: payload.targetSessionId,
                maxUses: Number(payload.maxUses ?? 1) || 1,
                ttlMinutes: payload.ttlMinutes,
            });
            if (!out.ok)
                return cb?.(out);
            const inv = out.invite;
            const resp = (0, invites_service_1.toInviteResponse)(inv);
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
        }
        catch {
            return cb?.({ ok: false, error: "INVITE_CREATE_FAILED" });
        }
    });
    // Accept invite (internal accept without opening external link)
    socket.on("invite:accept", async ({ token }, cb) => {
        try {
            const me = socket.data.sessionId;
            const out = await (0, invites_service_1.acceptInvite)({ meSessionId: me, token });
            if (!out.ok)
                return cb?.(out);
            const inv = (0, invites_service_1.toInviteResponse)(out.invite);
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
        }
        catch {
            return cb?.({ ok: false, error: "INVITE_ACCEPT_FAILED" });
        }
    });
    // Revoke invite
    socket.on("invite:revoke", async ({ token }, cb) => {
        try {
            const me = socket.data.sessionId;
            const out = await (0, invites_service_1.revokeInvite)({ meSessionId: me, token });
            if (!out.ok)
                return cb?.(out);
            const inv = (0, invites_service_1.toInviteResponse)(out.invite);
            // notify targeted user (if any)
            if (inv.targetSessionId) {
                io.to(sessionNs(inv.targetSessionId)).emit("invite:revoked", {
                    token: inv.token,
                });
            }
            return cb?.({ ok: true, invite: inv });
        }
        catch {
            return cb?.({ ok: false, error: "INVITE_REVOKE_FAILED" });
        }
    });
}
