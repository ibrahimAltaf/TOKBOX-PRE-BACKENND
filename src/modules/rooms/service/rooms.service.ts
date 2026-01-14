import mongoose from "mongoose";
import { RoomModel, type RoomType } from "../room.model";
import { RoomMemberModel } from "../roomMember.model";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

export async function createRoom(args: {
  type: RoomType;
  slug?: string;
  title?: string;
  maxUsers?: number;
  ownerSessionId?: string | null;
}) {
  // Public rooms should have slug (recommended)
  if (args.type === "PUBLIC") {
    // slug optional, but recommended. If omitted, you can later generate.
  }

  const doc = await RoomModel.create({
    type: args.type,
    slug: args.slug ?? null,
    title: args.title ?? null,
    maxUsers: args.maxUsers ?? null,

    // ✅ store as ObjectId (schema expects Types.ObjectId)
    ownerSessionId:
      args.ownerSessionId && isValidObjectId(args.ownerSessionId)
        ? new mongoose.Types.ObjectId(args.ownerSessionId)
        : null,

    isOpen: true,
    endedAt: null,
  });

  return doc;
}

export async function listPublicRooms(args: {
  type?: RoomType;
  q?: string;
  limit: number;
  cursor?: string;
}) {
  const createdBefore = args.cursor ? new Date(args.cursor) : null;

  const where: any = { isOpen: true };

  if (args.type) where.type = args.type;
  else where.type = "PUBLIC";

  if (args.q) {
    const re = new RegExp(args.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    where.$or = [{ title: re }, { slug: re }];
  }

  if (createdBefore) where.createdAt = { $lt: createdBefore };

  const rooms = await RoomModel.find(where)
    .sort({ createdAt: -1 })
    .limit(args.limit)
    .lean();

  const nextCursor = rooms.length
    ? new Date(rooms[rooms.length - 1].createdAt).toISOString()
    : null;

  return { rooms, nextCursor };
}

export async function getRoomById(roomId: string) {
  if (!isValidObjectId(roomId)) return null;
  return RoomModel.findById(roomId).lean();
}

export async function updateRoom(args: {
  roomId: string;
  title?: string;
  maxUsers?: number;
  isOpen?: boolean;
}) {
  if (!isValidObjectId(args.roomId)) return null;

  const update: any = {};
  if (args.title !== undefined) update.title = args.title;
  if (args.maxUsers !== undefined) update.maxUsers = args.maxUsers;

  if (args.isOpen !== undefined) {
    update.isOpen = args.isOpen;
    if (args.isOpen === false) update.endedAt = new Date();
    if (args.isOpen === true) update.endedAt = null;
  }

  const doc = await RoomModel.findByIdAndUpdate(args.roomId, update, {
    new: true,
  }).lean();
  return doc;
}

export async function closeRoom(roomId: string) {
  if (!isValidObjectId(roomId)) return null;

  const doc = await RoomModel.findByIdAndUpdate(
    roomId,
    { isOpen: false, endedAt: new Date() },
    { new: true }
  ).lean();

  return doc;
}

export function toRoomResponse(r: any) {
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
export async function closeRoomIfOwnerLeft(args: {
  roomId: string;
  leavingSessionId: string;
}) {
  if (!isValidObjectId(args.roomId)) {
    return { ok: false as const, error: "Invalid roomId" };
  }

  const room = await RoomModel.findById(args.roomId).lean();
  if (!room) return { ok: false as const, error: "Room not found" };
  if (room.isOpen === false) return { ok: true as const, closed: true };

  const ownerId = room.ownerSessionId ? String(room.ownerSessionId) : null;
  if (!ownerId) return { ok: true as const, closed: false };

  if (ownerId !== args.leavingSessionId) {
    return { ok: true as const, closed: false };
  }

  await RoomModel.updateOne(
    { _id: new mongoose.Types.ObjectId(args.roomId), isOpen: true },
    { $set: { isOpen: false, endedAt: new Date() } }
  );

  await RoomMemberModel.updateMany(
    { roomId: new mongoose.Types.ObjectId(args.roomId), leftAt: null },
    { $set: { leftAt: new Date(), lastSeenAt: new Date() } }
  );

  return { ok: true as const, closed: true };
}
