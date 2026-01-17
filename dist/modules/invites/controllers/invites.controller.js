"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInviteController = createInviteController;
exports.listIncomingInvitesController = listIncomingInvitesController;
exports.previewInviteController = previewInviteController;
exports.acceptInviteController = acceptInviteController;
exports.revokeInviteController = revokeInviteController;
const invites_schemas_1 = require("../schemas/invites.schemas");
const invites_service_1 = require("../service/invites.service");
async function createInviteController(req, res) {
    const parsed = invites_schemas_1.CreateInviteSchema.safeParse(req.body ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const inviterSessionId = req.session.id;
    const out = await (0, invites_service_1.createInvite)({
        inviterSessionId,
        kind: parsed.data.kind,
        roomId: parsed.data.roomId,
        dmThreadId: parsed.data.dmThreadId,
        targetSessionId: parsed.data.targetSessionId,
        maxUses: parsed.data.maxUses,
        ttlMinutes: parsed.data.ttlMinutes,
    });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    // client will build a URL on frontend: `${APP_URL}/invite/${token}`
    return res.json({ ok: true, invite: (0, invites_service_1.toInviteResponse)(out.invite) });
}
async function listIncomingInvitesController(req, res) {
    const parsed = invites_schemas_1.ListMyInvitesSchema.safeParse(req.query ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, invites_service_1.listIncomingInvites)({
        meSessionId,
        limit: parsed.data.limit,
    });
    return res.json({ ok: true, invites: out.invites.map(invites_service_1.toInviteResponse) });
}
async function previewInviteController(req, res) {
    const token = String(req.params.token || "").trim();
    const out = await (0, invites_service_1.getInviteByToken)(token);
    if (!out.ok)
        return res.status(404).json({ ok: false, error: out.error });
    return res.json({ ok: true, invite: (0, invites_service_1.toInviteResponse)(out.invite) });
}
async function acceptInviteController(req, res) {
    const parsed = invites_schemas_1.AcceptInviteSchema.safeParse(req.body ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, invites_service_1.acceptInvite)({ meSessionId, token: parsed.data.token });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    return res.json({ ok: true, invite: (0, invites_service_1.toInviteResponse)(out.invite) });
}
async function revokeInviteController(req, res) {
    const token = String(req.params.token || "").trim();
    const meSessionId = req.session.id;
    const out = await (0, invites_service_1.revokeInvite)({ meSessionId, token });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    return res.json({ ok: true, invite: (0, invites_service_1.toInviteResponse)(out.invite) });
}
