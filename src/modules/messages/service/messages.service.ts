import mongoose from "mongoose";
import { MessageModel } from "../message.model";
import { RoomModel } from "../../rooms/room.model";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

export async function sendRoomMessage(args: {
  roomId: string;
  senderSessionId: string;
  text?: string;
  mediaUrls?: string[];
  mediaIds?: string[];
}) {
  if (!isValidObjectId(args.roomId))
    return { ok: false as const, error: "Invalid roomId" };
  const room = await RoomModel.findById(args.roomId).lean();
  if (!room || !room.isOpen)
    return { ok: false as const, error: "Room not found or closed" };

  const text = (args.text ?? "").trim();
  const mediaUrls = args.mediaUrls ?? [];
  const mediaIds = args.mediaIds ?? [];

  if (!text && mediaUrls.length === 0 && mediaIds.length === 0) {
    return { ok: false as const, error: "Message must include text or media" };
  }

  const doc = await MessageModel.create({
    roomId: args.roomId,
    senderSessionId: args.senderSessionId,
    type: "TEXT",
    text: text || null,
    mediaUrls,
    mediaIds,
    deletedAt: null,
  });

  return { ok: true as const, message: doc };
}

export async function listRoomMessages(args: {
  roomId: string;
  limit: number;
  cursor?: string;
}) {
  if (!isValidObjectId(args.roomId))
    return { ok: false as const, error: "Invalid roomId" };

  const createdBefore = args.cursor ? new Date(args.cursor) : null;

  const where: any = { roomId: args.roomId, deletedAt: null };
  if (createdBefore) where.createdAt = { $lt: createdBefore };

  const items = await MessageModel.find(where)
    .sort({ createdAt: -1 })
    .limit(args.limit)
    .lean();

  const nextCursor = items.length
    ? new Date(items[items.length - 1].createdAt).toISOString()
    : null;

  return { ok: true as const, messages: items, nextCursor };
}

export function toMessageResponse(m: any) {
  return {
    id: String(m._id),
    roomId: String(m.roomId),
    senderSessionId: m.senderSessionId ? String(m.senderSessionId) : null,
    type: m.type,
    text: m.text,
    mediaUrls: m.mediaUrls ?? [],
    mediaIds: (m.mediaIds ?? []).map((x: any) => String(x)),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
