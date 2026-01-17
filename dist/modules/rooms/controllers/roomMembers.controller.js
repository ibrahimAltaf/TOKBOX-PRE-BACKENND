"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinRoomController = joinRoomController;
exports.leaveRoomController = leaveRoomController;
exports.listRoomMembersController = listRoomMembersController;
exports.kickMemberController = kickMemberController;
exports.banMemberController = banMemberController;
const zod_1 = require("zod");
const roomMembers_service_1 = require("../service/roomMembers.service");
const JoinSchema = zod_1.z.object({ roomId: zod_1.z.string().trim() });
const LeaveSchema = zod_1.z.object({ roomId: zod_1.z.string().trim() });
const ListSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(100),
});
const KickSchema = zod_1.z.object({
    targetSessionId: zod_1.z.string().trim(),
});
const BanSchema = zod_1.z.object({
    targetSessionId: zod_1.z.string().trim(),
    minutes: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(60 * 24 * 30)
        .default(60),
});
async function joinRoomController(req, res) {
    const parsed = JoinSchema.safeParse(req.params);
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, roomMembers_service_1.joinRoom)({
        roomId: parsed.data.roomId,
        sessionId: meSessionId,
    });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    return res.json({
        ok: true,
        role: out.role,
        member: (0, roomMembers_service_1.toRoomMemberResponse)(out.member),
    });
}
async function leaveRoomController(req, res) {
    const parsed = LeaveSchema.safeParse(req.params);
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, roomMembers_service_1.leaveRoom)({
        roomId: parsed.data.roomId,
        sessionId: meSessionId,
    });
    return res.json({
        ok: true,
        member: out.member ? (0, roomMembers_service_1.toRoomMemberResponse)(out.member) : null,
    });
}
async function listRoomMembersController(req, res) {
    const roomId = String(req.params.roomId || "").trim();
    const parsed = ListSchema.safeParse(req.query ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const out = await (0, roomMembers_service_1.listRoomMembers)({ roomId, limit: parsed.data.limit });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    return res.json({ ok: true, members: out.members.map(roomMembers_service_1.toRoomMemberResponse) });
}
async function kickMemberController(req, res) {
    const roomId = String(req.params.roomId || "").trim();
    const body = KickSchema.safeParse(req.body ?? {});
    if (!body.success)
        return res.status(400).json({ ok: false, error: body.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, roomMembers_service_1.kickMember)({
        roomId,
        meSessionId,
        targetSessionId: body.data.targetSessionId,
    });
    if (!out.ok)
        return res.status(403).json({ ok: false, error: out.error });
    return res.json({ ok: true, member: (0, roomMembers_service_1.toRoomMemberResponse)(out.member) });
}
async function banMemberController(req, res) {
    const roomId = String(req.params.roomId || "").trim();
    const body = BanSchema.safeParse(req.body ?? {});
    if (!body.success)
        return res.status(400).json({ ok: false, error: body.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, roomMembers_service_1.banMember)({
        roomId,
        meSessionId,
        targetSessionId: body.data.targetSessionId,
        minutes: body.data.minutes,
    });
    if (!out.ok)
        return res.status(403).json({ ok: false, error: out.error });
    return res.json({ ok: true, member: (0, roomMembers_service_1.toRoomMemberResponse)(out.member) });
}
