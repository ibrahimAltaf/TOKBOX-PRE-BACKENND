"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.listRoomMembers = listRoomMembers;
exports.kickMember = kickMember;
exports.banMember = banMember;
exports.toRoomMemberResponse = toRoomMemberResponse;
const mongoose_1 = __importDefault(require("mongoose"));
const roomMember_model_1 = require("../roomMember.model");
const room_model_1 = require("../room.model");
function oid(id) {
    return new mongoose_1.default.Types.ObjectId(id);
}
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
async function joinRoom(args) {
    if (!isValidObjectId(args.roomId))
        return { ok: false, error: "Invalid roomId" };
    const room = await room_model_1.RoomModel.findById(args.roomId).lean();
    if (!room)
        return { ok: false, error: "Room not found" };
    if (room.isOpen === false)
        return { ok: false, error: "Room is closed" };
    // ban check (existing membership)
    const existing = await roomMember_model_1.RoomMemberModel.findOne({
        roomId: oid(args.roomId),
        sessionId: oid(args.sessionId),
    }).lean();
    if (existing?.bannedUntil &&
        new Date(existing.bannedUntil).getTime() > Date.now()) {
        return { ok: false, error: "You are banned" };
    }
    // enforce maxUsers: count active members
    const activeCount = await roomMember_model_1.RoomMemberModel.countDocuments({
        roomId: oid(args.roomId),
        leftAt: null,
        bannedUntil: null,
    });
    const maxUsers = Number(room.maxUsers ?? 0);
    if (maxUsers > 0 && activeCount >= maxUsers) {
        return { ok: false, error: "Room is full" };
    }
    // if room has no active owner, first join becomes OWNER
    const ownerExists = await roomMember_model_1.RoomMemberModel.exists({
        roomId: oid(args.roomId),
        role: "OWNER",
        leftAt: null,
    });
    const role = ownerExists ? "MEMBER" : "OWNER";
    // ✅ set room ownerSessionId when first owner joins
    if (role === "OWNER" && !room.ownerSessionId) {
        await room_model_1.RoomModel.updateOne({ _id: oid(args.roomId), ownerSessionId: null }, { $set: { ownerSessionId: oid(args.sessionId) } });
    }
    const member = await roomMember_model_1.RoomMemberModel.findOneAndUpdate({ roomId: oid(args.roomId), sessionId: oid(args.sessionId) }, {
        $set: {
            role,
            joinedAt: new Date(),
            leftAt: null,
            kickedAt: null,
            kickedBySessionId: null,
            bannedUntil: null,
            bannedBySessionId: null,
            lastSeenAt: new Date(),
        },
    }, { upsert: true, new: true }).lean();
    return { ok: true, member, role, room };
}
async function leaveRoom(args) {
    if (!isValidObjectId(args.roomId))
        return { ok: false, error: "Invalid roomId" };
    const member = await roomMember_model_1.RoomMemberModel.findOneAndUpdate({ roomId: oid(args.roomId), sessionId: oid(args.sessionId) }, { $set: { leftAt: new Date(), lastSeenAt: new Date() } }, { new: true }).lean();
    return { ok: true, member };
}
async function listRoomMembers(args) {
    if (!isValidObjectId(args.roomId))
        return { ok: false, error: "Invalid roomId" };
    const members = await roomMember_model_1.RoomMemberModel.find({
        roomId: oid(args.roomId),
        leftAt: null,
    })
        .sort({ role: 1, joinedAt: -1 })
        .limit(args.limit)
        .lean();
    return { ok: true, members };
}
async function requireOwner(roomId, meSessionId) {
    const me = await roomMember_model_1.RoomMemberModel.findOne({
        roomId: oid(roomId),
        sessionId: oid(meSessionId),
        leftAt: null,
    }).lean();
    if (!me)
        return { ok: false, error: "Not in room" };
    if (me.role !== "OWNER")
        return { ok: false, error: "Owner only" };
    return { ok: true, me };
}
async function kickMember(args) {
    if (!isValidObjectId(args.roomId) || !isValidObjectId(args.targetSessionId)) {
        return { ok: false, error: "Invalid id(s)" };
    }
    const auth = await requireOwner(args.roomId, args.meSessionId);
    if (!auth.ok)
        return auth;
    if (args.meSessionId === args.targetSessionId) {
        return { ok: false, error: "Owner cannot kick self" };
    }
    const updated = await roomMember_model_1.RoomMemberModel.findOneAndUpdate({
        roomId: oid(args.roomId),
        sessionId: oid(args.targetSessionId),
        leftAt: null,
    }, {
        $set: {
            kickedAt: new Date(),
            kickedBySessionId: oid(args.meSessionId),
            leftAt: new Date(),
        },
    }, { new: true }).lean();
    if (!updated)
        return { ok: false, error: "Target not found in room" };
    return { ok: true, member: updated };
}
async function banMember(args) {
    if (!isValidObjectId(args.roomId) || !isValidObjectId(args.targetSessionId)) {
        return { ok: false, error: "Invalid id(s)" };
    }
    const auth = await requireOwner(args.roomId, args.meSessionId);
    if (!auth.ok)
        return auth;
    if (args.meSessionId === args.targetSessionId) {
        return { ok: false, error: "Owner cannot ban self" };
    }
    const mins = Math.max(1, Math.min(60 * 24 * 30, Number(args.minutes || 0)));
    const bannedUntil = new Date(Date.now() + mins * 60_000);
    const updated = await roomMember_model_1.RoomMemberModel.findOneAndUpdate({ roomId: oid(args.roomId), sessionId: oid(args.targetSessionId) }, {
        $set: {
            bannedUntil,
            bannedBySessionId: oid(args.meSessionId),
            leftAt: new Date(),
        },
    }, { upsert: true, new: true }).lean();
    return { ok: true, member: updated };
}
function toRoomMemberResponse(m) {
    return {
        id: String(m._id),
        roomId: String(m.roomId),
        sessionId: String(m.sessionId),
        role: m.role,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
        kickedAt: m.kickedAt,
        kickedBySessionId: m.kickedBySessionId ? String(m.kickedBySessionId) : null,
        bannedUntil: m.bannedUntil,
        bannedBySessionId: m.bannedBySessionId ? String(m.bannedBySessionId) : null,
        lastSeenAt: m.lastSeenAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
    };
}
