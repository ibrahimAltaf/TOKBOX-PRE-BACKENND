"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openThread = openThread;
exports.listThreads = listThreads;
exports.listThreadMessages = listThreadMessages;
exports.sendDmMessage = sendDmMessage;
exports.toThreadResponse = toThreadResponse;
exports.toDmMessageResponse = toDmMessageResponse;
const mongoose_1 = __importDefault(require("mongoose"));
const dmThread_model_1 = require("../dmThread.model");
const dmMessage_model_1 = require("../dmMessage.model");
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
function sortPair(a, b) {
    return a < b ? [a, b] : [b, a];
}
function toIsoCursor(v) {
    if (!v)
        return null;
    if (v instanceof Date)
        return v.toISOString();
    if (typeof v === "string" || typeof v === "number")
        return new Date(v).toISOString();
    // Mongoose NativeDate sometimes shows up oddly in typings; attempt conversion
    try {
        return new Date(v).toISOString();
    }
    catch {
        return null;
    }
}
async function openThread(args) {
    if (!isValidObjectId(args.targetSessionId)) {
        return { ok: false, error: "Invalid targetSessionId" };
    }
    if (args.meSessionId === args.targetSessionId) {
        return { ok: false, error: "Cannot DM yourself" };
    }
    const [A, B] = sortPair(args.meSessionId, args.targetSessionId);
    const existing = await dmThread_model_1.DmThreadModel.findOne({
        sessionAId: A,
        sessionBId: B,
    }).lean();
    if (existing)
        return { ok: true, thread: existing };
    const created = await dmThread_model_1.DmThreadModel.create({
        sessionAId: A,
        sessionBId: B,
        lastMessageAt: null,
        lastReadAtA: null,
        lastReadAtB: null,
    });
    return { ok: true, thread: created.toObject() };
}
/**
 * NOTE:
 * For stable pagination and to avoid null lastMessageAt issues,
 * we paginate on updatedAt (threads update when message is sent).
 */
async function listThreads(args) {
    const c = args.cursor ? new Date(args.cursor) : null;
    const where = {
        $or: [{ sessionAId: args.meSessionId }, { sessionBId: args.meSessionId }],
    };
    // stable cursor
    if (c)
        where.updatedAt = { $lt: c };
    const threads = await dmThread_model_1.DmThreadModel.find(where)
        .sort({ updatedAt: -1 })
        .limit(args.limit)
        .lean();
    const last = threads.length ? threads[threads.length - 1] : null;
    const nextCursor = last ? toIsoCursor(last.updatedAt) : null;
    return { ok: true, threads, nextCursor };
}
async function listThreadMessages(args) {
    if (!isValidObjectId(args.threadId)) {
        return { ok: false, error: "Invalid threadId" };
    }
    const thread = await dmThread_model_1.DmThreadModel.findById(args.threadId).lean();
    if (!thread)
        return { ok: false, error: "Thread not found" };
    const meInThread = String(thread.sessionAId) === args.meSessionId ||
        String(thread.sessionBId) === args.meSessionId;
    if (!meInThread)
        return { ok: false, error: "Forbidden" };
    const createdBefore = args.cursor ? new Date(args.cursor) : null;
    const where = { threadId: args.threadId, deletedAt: null };
    if (createdBefore)
        where.createdAt = { $lt: createdBefore };
    const items = await dmMessage_model_1.DmMessageModel.find(where)
        .sort({ createdAt: -1 })
        .limit(args.limit)
        .lean();
    const last = items.length ? items[items.length - 1] : null;
    const nextCursor = last ? toIsoCursor(last.createdAt) : null;
    return { ok: true, messages: items, nextCursor };
}
async function sendDmMessage(args) {
    if (!isValidObjectId(args.threadId)) {
        return { ok: false, error: "Invalid threadId" };
    }
    const thread = await dmThread_model_1.DmThreadModel.findById(args.threadId);
    if (!thread)
        return { ok: false, error: "Thread not found" };
    const meInThread = String(thread.sessionAId) === args.meSessionId ||
        String(thread.sessionBId) === args.meSessionId;
    if (!meInThread)
        return { ok: false, error: "Forbidden" };
    const text = (args.text ?? "").trim();
    const mediaUrls = args.mediaUrls ?? [];
    const mediaIds = args.mediaIds ?? [];
    if (!text && mediaUrls.length === 0 && mediaIds.length === 0) {
        return { ok: false, error: "Message must include text or media" };
    }
    const msg = await dmMessage_model_1.DmMessageModel.create({
        threadId: args.threadId,
        senderSessionId: args.meSessionId,
        text: text || null,
        mediaUrls,
        mediaIds,
        deletedAt: null,
    });
    // keep both fields: lastMessageAt (semantic) + updatedAt (cursor)
    thread.lastMessageAt = new Date();
    await thread.save();
    return {
        ok: true,
        message: msg.toObject(),
        thread: thread.toObject(),
    };
}
function toThreadResponse(t, meSessionId) {
    const a = String(t.sessionAId);
    const b = String(t.sessionBId);
    const otherSessionId = meSessionId ? (a === meSessionId ? b : a) : null;
    return {
        id: String(t._id),
        sessionAId: a,
        sessionBId: b,
        otherSessionId,
        lastMessageAt: t.lastMessageAt ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}
function toDmMessageResponse(m) {
    return {
        id: String(m._id),
        threadId: String(m.threadId),
        senderSessionId: String(m.senderSessionId),
        text: m.text,
        mediaUrls: m.mediaUrls ?? [],
        mediaIds: (m.mediaIds ?? []).map((x) => String(x)),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
    };
}
