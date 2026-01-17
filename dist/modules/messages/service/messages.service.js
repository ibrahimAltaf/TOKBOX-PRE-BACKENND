"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRoomMessage = sendRoomMessage;
exports.listRoomMessages = listRoomMessages;
exports.toMessageResponse = toMessageResponse;
const mongoose_1 = __importDefault(require("mongoose"));
const message_model_1 = require("../message.model");
const room_model_1 = require("../../rooms/room.model");
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
async function sendRoomMessage(args) {
    if (!isValidObjectId(args.roomId))
        return { ok: false, error: "Invalid roomId" };
    const room = await room_model_1.RoomModel.findById(args.roomId).lean();
    if (!room || !room.isOpen)
        return { ok: false, error: "Room not found or closed" };
    const text = (args.text ?? "").trim();
    const mediaUrls = args.mediaUrls ?? [];
    const mediaIds = args.mediaIds ?? [];
    if (!text && mediaUrls.length === 0 && mediaIds.length === 0) {
        return { ok: false, error: "Message must include text or media" };
    }
    const doc = await message_model_1.MessageModel.create({
        roomId: args.roomId,
        senderSessionId: args.senderSessionId,
        type: "TEXT",
        text: text || null,
        mediaUrls,
        mediaIds,
        deletedAt: null,
    });
    return { ok: true, message: doc };
}
async function listRoomMessages(args) {
    if (!isValidObjectId(args.roomId))
        return { ok: false, error: "Invalid roomId" };
    const createdBefore = args.cursor ? new Date(args.cursor) : null;
    const where = { roomId: args.roomId, deletedAt: null };
    if (createdBefore)
        where.createdAt = { $lt: createdBefore };
    const items = await message_model_1.MessageModel.find(where)
        .sort({ createdAt: -1 })
        .limit(args.limit)
        .lean();
    const nextCursor = items.length
        ? new Date(items[items.length - 1].createdAt).toISOString()
        : null;
    return { ok: true, messages: items, nextCursor };
}
function toMessageResponse(m) {
    return {
        id: String(m._id),
        roomId: String(m.roomId),
        senderSessionId: m.senderSessionId ? String(m.senderSessionId) : null,
        type: m.type,
        text: m.text,
        mediaUrls: m.mediaUrls ?? [],
        mediaIds: (m.mediaIds ?? []).map((x) => String(x)),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
    };
}
