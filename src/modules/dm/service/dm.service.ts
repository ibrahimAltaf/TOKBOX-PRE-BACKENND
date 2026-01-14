import mongoose from "mongoose";
import { DmThreadModel } from "../dmThread.model";
import { DmMessageModel } from "../dmMessage.model";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

function sortPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

function toIsoCursor(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" || typeof v === "number")
    return new Date(v).toISOString();
  // Mongoose NativeDate sometimes shows up oddly in typings; attempt conversion
  try {
    return new Date(v as any).toISOString();
  } catch {
    return null;
  }
}

export async function openThread(args: {
  meSessionId: string;
  targetSessionId: string;
}) {
  if (!isValidObjectId(args.targetSessionId)) {
    return { ok: false as const, error: "Invalid targetSessionId" };
  }
  if (args.meSessionId === args.targetSessionId) {
    return { ok: false as const, error: "Cannot DM yourself" };
  }

  const [A, B] = sortPair(args.meSessionId, args.targetSessionId);

  const existing = await DmThreadModel.findOne({
    sessionAId: A,
    sessionBId: B,
  }).lean();

  if (existing) return { ok: true as const, thread: existing };

  const created = await DmThreadModel.create({
    sessionAId: A,
    sessionBId: B,
    lastMessageAt: null,
    lastReadAtA: null,
    lastReadAtB: null,
  });

  return { ok: true as const, thread: created.toObject() };
}

/**
 * NOTE:
 * For stable pagination and to avoid null lastMessageAt issues,
 * we paginate on updatedAt (threads update when message is sent).
 */
export async function listThreads(args: {
  meSessionId: string;
  limit: number;
  cursor?: string;
}) {
  const c = args.cursor ? new Date(args.cursor) : null;

  const where: any = {
    $or: [{ sessionAId: args.meSessionId }, { sessionBId: args.meSessionId }],
  };

  // stable cursor
  if (c) where.updatedAt = { $lt: c };

  const threads = await DmThreadModel.find(where)
    .sort({ updatedAt: -1 })
    .limit(args.limit)
    .lean();

  const last = threads.length ? threads[threads.length - 1] : null;
  const nextCursor = last ? toIsoCursor((last as any).updatedAt) : null;

  return { ok: true as const, threads, nextCursor };
}

export async function listThreadMessages(args: {
  meSessionId: string;
  threadId: string;
  limit: number;
  cursor?: string;
}) {
  if (!isValidObjectId(args.threadId)) {
    return { ok: false as const, error: "Invalid threadId" };
  }

  const thread = await DmThreadModel.findById(args.threadId).lean();
  if (!thread) return { ok: false as const, error: "Thread not found" };

  const meInThread =
    String(thread.sessionAId) === args.meSessionId ||
    String(thread.sessionBId) === args.meSessionId;

  if (!meInThread) return { ok: false as const, error: "Forbidden" };

  const createdBefore = args.cursor ? new Date(args.cursor) : null;

  const where: any = { threadId: args.threadId, deletedAt: null };
  if (createdBefore) where.createdAt = { $lt: createdBefore };

  const items = await DmMessageModel.find(where)
    .sort({ createdAt: -1 })
    .limit(args.limit)
    .lean();

  const last = items.length ? items[items.length - 1] : null;
  const nextCursor = last ? toIsoCursor((last as any).createdAt) : null;

  return { ok: true as const, messages: items, nextCursor };
}

export async function sendDmMessage(args: {
  meSessionId: string;
  threadId: string;
  text?: string;
  mediaUrls?: string[];
  mediaIds?: string[];
}) {
  if (!isValidObjectId(args.threadId)) {
    return { ok: false as const, error: "Invalid threadId" };
  }

  const thread = await DmThreadModel.findById(args.threadId);
  if (!thread) return { ok: false as const, error: "Thread not found" };

  const meInThread =
    String(thread.sessionAId) === args.meSessionId ||
    String(thread.sessionBId) === args.meSessionId;

  if (!meInThread) return { ok: false as const, error: "Forbidden" };

  const text = (args.text ?? "").trim();
  const mediaUrls = args.mediaUrls ?? [];
  const mediaIds = args.mediaIds ?? [];

  if (!text && mediaUrls.length === 0 && mediaIds.length === 0) {
    return { ok: false as const, error: "Message must include text or media" };
  }

  const msg = await DmMessageModel.create({
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
    ok: true as const,
    message: msg.toObject(),
    thread: thread.toObject(),
  };
}

export function toThreadResponse(t: any, meSessionId?: string) {
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

export function toDmMessageResponse(m: any) {
  return {
    id: String(m._id),
    threadId: String(m.threadId),
    senderSessionId: String(m.senderSessionId),
    text: m.text,
    mediaUrls: m.mediaUrls ?? [],
    mediaIds: (m.mediaIds ?? []).map((x: any) => String(x)),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
