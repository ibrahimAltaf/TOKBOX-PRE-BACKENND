"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.listPublicRooms = listPublicRooms;
exports.getRoomById = getRoomById;
exports.updateRoom = updateRoom;
exports.closeRoom = closeRoom;
exports.toRoomResponse = toRoomResponse;
exports.closeRoomIfOwnerLeft = closeRoomIfOwnerLeft;
const mongoose_1 = __importDefault(require("mongoose"));
const room_model_1 = require("../room.model");
const roomMember_model_1 = require("../roomMember.model");
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
async function createRoom(args) {
    // Public rooms should have slug (recommended)
    if (args.type === "PUBLIC") {
        // slug optional, but recommended. If omitted, you can later generate.
    }
    const doc = await room_model_1.RoomModel.create({
        type: args.type,
        slug: args.slug ?? null,
        title: args.title ?? null,
        maxUsers: args.maxUsers ?? null,
        // ✅ store as ObjectId (schema expects Types.ObjectId)
        ownerSessionId: args.ownerSessionId && isValidObjectId(args.ownerSessionId)
            ? new mongoose_1.default.Types.ObjectId(args.ownerSessionId)
            : null,
        isOpen: true,
        endedAt: null,
    });
    return doc;
}
async function listPublicRooms(args) {
    const createdBefore = args.cursor ? new Date(args.cursor) : null;
    const where = { isOpen: true };
    if (args.type)
        where.type = args.type;
    else
        where.type = "PUBLIC";
    if (args.q) {
        const re = new RegExp(args.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        where.$or = [{ title: re }, { slug: re }];
    }
    if (createdBefore)
        where.createdAt = { $lt: createdBefore };
    const rooms = await room_model_1.RoomModel.find(where)
        .sort({ createdAt: -1 })
        .limit(args.limit)
        .lean();
    const nextCursor = rooms.length
        ? new Date(rooms[rooms.length - 1].createdAt).toISOString()
        : null;
    return { rooms, nextCursor };
}
async function getRoomById(roomId) {
    if (!isValidObjectId(roomId))
        return null;
    return room_model_1.RoomModel.findById(roomId).lean();
}
async function updateRoom(args) {
    if (!isValidObjectId(args.roomId))
        return null;
    const update = {};
    if (args.title !== undefined)
        update.title = args.title;
    if (args.maxUsers !== undefined)
        update.maxUsers = args.maxUsers;
    if (args.isOpen !== undefined) {
        update.isOpen = args.isOpen;
        if (args.isOpen === false)
            update.endedAt = new Date();
        if (args.isOpen === true)
            update.endedAt = null;
    }
    const doc = await room_model_1.RoomModel.findByIdAndUpdate(args.roomId, update, {
        new: true,
    }).lean();
    return doc;
}
async function closeRoom(roomId) {
    if (!isValidObjectId(roomId))
        return null;
    const doc = await room_model_1.RoomModel.findByIdAndUpdate(roomId, { isOpen: false, endedAt: new Date() }, { new: true }).lean();
    return doc;
}
function toRoomResponse(r) {
    return {
        id: String(r._id),
        type: r.type,
        slug: r.slug,
        title: r.title,
        ownerSessionId: r.ownerSessionId ? String(r.ownerSessionId) : null,
        isOpen: r.isOpen,
        maxUsers: r.maxUsers,
        endedAt: r.endedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}
/**
 * ✅ NEW: owner leaves => close room
 * Does NOT change any existing controllers.
 */
async function closeRoomIfOwnerLeft(args) {
    if (!isValidObjectId(args.roomId)) {
        return { ok: false, error: "Invalid roomId" };
    }
    const room = await room_model_1.RoomModel.findById(args.roomId).lean();
    if (!room)
        return { ok: false, error: "Room not found" };
    if (room.isOpen === false)
        return { ok: true, closed: true };
    const ownerId = room.ownerSessionId ? String(room.ownerSessionId) : null;
    if (!ownerId)
        return { ok: true, closed: false };
    if (ownerId !== args.leavingSessionId) {
        return { ok: true, closed: false };
    }
    await room_model_1.RoomModel.updateOne({ _id: new mongoose_1.default.Types.ObjectId(args.roomId), isOpen: true }, { $set: { isOpen: false, endedAt: new Date() } });
    await roomMember_model_1.RoomMemberModel.updateMany({ roomId: new mongoose_1.default.Types.ObjectId(args.roomId), leftAt: null }, { $set: { leftAt: new Date(), lastSeenAt: new Date() } });
    return { ok: true, closed: true };
}
