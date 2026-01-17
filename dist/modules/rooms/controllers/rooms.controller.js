"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoomController = createRoomController;
exports.listRoomsController = listRoomsController;
exports.getRoomController = getRoomController;
exports.patchRoomController = patchRoomController;
exports.deleteRoomController = deleteRoomController;
const rooms_schemas_1 = require("../schemas/rooms.schemas");
const rooms_service_1 = require("../service/rooms.service");
async function createRoomController(req, res) {
    const parsed = rooms_schemas_1.CreateRoomSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }
    // owner is optional at REST stage, but we attach if session exists (authenticated route recommended)
    const ownerSessionId = req.session?.id ?? null;
    const doc = await (0, rooms_service_1.createRoom)({
        type: parsed.data.type,
        slug: parsed.data.slug,
        title: parsed.data.title,
        maxUsers: parsed.data.maxUsers,
        ownerSessionId,
    });
    return res.json({ ok: true, room: (0, rooms_service_1.toRoomResponse)(doc) });
}
async function listRoomsController(req, res) {
    const parsed = rooms_schemas_1.ListRoomsSchema.safeParse(req.query ?? {});
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }
    const out = await (0, rooms_service_1.listPublicRooms)({
        type: parsed.data.type,
        q: parsed.data.q,
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
    });
    return res.json({
        ok: true,
        rooms: out.rooms.map(rooms_service_1.toRoomResponse),
        nextCursor: out.nextCursor,
    });
}
async function getRoomController(req, res) {
    const id = String(req.params.id || "").trim();
    const r = await (0, rooms_service_1.getRoomById)(id);
    if (!r)
        return res.status(404).json({ ok: false, error: "Room not found" });
    return res.json({ ok: true, room: (0, rooms_service_1.toRoomResponse)(r) });
}
async function patchRoomController(req, res) {
    const id = String(req.params.id || "").trim();
    const parsed = rooms_schemas_1.UpdateRoomSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }
    const r = await (0, rooms_service_1.updateRoom)({
        roomId: id,
        title: parsed.data.title,
        maxUsers: parsed.data.maxUsers,
        isOpen: parsed.data.isOpen,
    });
    if (!r)
        return res.status(404).json({ ok: false, error: "Room not found" });
    return res.json({ ok: true, room: (0, rooms_service_1.toRoomResponse)(r) });
}
async function deleteRoomController(req, res) {
    const id = String(req.params.id || "").trim();
    const r = await (0, rooms_service_1.closeRoom)(id);
    if (!r)
        return res.status(404).json({ ok: false, error: "Room not found" });
    return res.json({ ok: true, room: (0, rooms_service_1.toRoomResponse)(r) });
}
