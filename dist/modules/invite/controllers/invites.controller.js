"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInviteController = createInviteController;
exports.listIncomingInvitesController = listIncomingInvitesController;
exports.getInviteController = getInviteController;
exports.acceptInviteController = acceptInviteController;
exports.revokeInviteController = revokeInviteController;
const zod_1 = require("zod");
const invites_service_1 = require("../service/invites.service");
function inviteAction(inv) {
    if (inv.kind === "DM")
        return { type: "OPEN_DM", dmThreadId: inv.dmThreadId ?? null };
    if (inv.kind === "ROOM")
        return { type: "JOIN_ROOM", roomId: inv.roomId ?? null };
    if (inv.kind === "VIDEO_GROUP")
        return { type: "JOIN_VIDEO_GROUP", roomId: inv.roomId ?? null };
    if (inv.kind === "VIDEO_1ON1")
        return { type: "JOIN_VIDEO_1ON1", roomId: inv.roomId ?? null };
    return { type: "UNKNOWN" };
}
const CreateBody = zod_1.z.object({
    kind: zod_1.z.enum(["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"]),
    roomId: zod_1.z.string().optional(),
    dmThreadId: zod_1.z.string().optional(),
    targetSessionId: zod_1.z.string().optional(),
    maxUses: zod_1.z.coerce.number().int().min(1).max(50).default(1),
    ttlMinutes: zod_1.z.coerce.number().int().min(1).max(60 * 24 * 30).optional(),
});
async function createInviteController(req, res) {
    const meSessionId = req.session.id;
    const body = CreateBody.parse(req.body);
    const out = await (0, invites_service_1.createInvite)({
        inviterSessionId: meSessionId,
        kind: body.kind,
        roomId: body.roomId,
        dmThreadId: body.dmThreadId,
        targetSessionId: body.targetSessionId,
        maxUses: body.maxUses,
        ttlMinutes: body.ttlMinutes,
    });
    if (!out.ok)
        return res.status(400).json(out);
    const inv = (0, invites_service_1.toInviteResponse)(out.invite);
    return res.json({ ok: true, invite: inv, action: inviteAction(inv) });
}
async function listIncomingInvitesController(req, res) {
    const meSessionId = req.session.id;
    const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));
    const out = await (0, invites_service_1.listIncomingInvites)({ meSessionId, limit });
    if (!out.ok)
        return res.status(400).json(out);
    const items = out.invites.map((x) => {
        const inv = (0, invites_service_1.toInviteResponse)(x);
        return { invite: inv, action: inviteAction(inv) };
    });
    return res.json({ ok: true, items });
}
async function getInviteController(req, res) {
    const token = String(req.params.token || "");
    const out = await (0, invites_service_1.getInviteByToken)(token);
    if (!out.ok)
        return res.status(404).json(out);
    const inv = (0, invites_service_1.toInviteResponse)(out.invite);
    return res.json({ ok: true, invite: inv, action: inviteAction(inv) });
}
async function acceptInviteController(req, res) {
    const meSessionId = req.session.id;
    const token = String(req.params.token || "");
    const out = await (0, invites_service_1.acceptInvite)({ meSessionId, token });
    if (!out.ok)
        return res.status(400).json(out);
    const inv = (0, invites_service_1.toInviteResponse)(out.invite);
    return res.json({ ok: true, invite: inv, action: inviteAction(inv) });
}
async function revokeInviteController(req, res) {
    const meSessionId = req.session.id;
    const token = String(req.params.token || "");
    const out = await (0, invites_service_1.revokeInvite)({ meSessionId, token });
    if (!out.ok)
        return res.status(400).json(out);
    const inv = (0, invites_service_1.toInviteResponse)(out.invite);
    return res.json({ ok: true, invite: inv });
}
