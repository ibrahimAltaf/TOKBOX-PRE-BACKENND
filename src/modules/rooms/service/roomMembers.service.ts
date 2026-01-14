import mongoose from "mongoose";
import { RoomMemberModel } from "../roomMember.model";
import { RoomModel } from "../room.model";

function oid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

export async function joinRoom(args: { roomId: string; sessionId: string }) {
  if (!isValidObjectId(args.roomId))
    return { ok: false as const, error: "Invalid roomId" };

  const room = await RoomModel.findById(args.roomId).lean();
  if (!room) return { ok: false as const, error: "Room not found" };
  if (room.isOpen === false)
    return { ok: false as const, error: "Room is closed" };

  // ban check (existing membership)
  const existing = await RoomMemberModel.findOne({
    roomId: oid(args.roomId),
    sessionId: oid(args.sessionId),
  }).lean();

  if (
    existing?.bannedUntil &&
    new Date(existing.bannedUntil).getTime() > Date.now()
  ) {
    return { ok: false as const, error: "You are banned" };
  }

  // enforce maxUsers: count active members
  const activeCount = await RoomMemberModel.countDocuments({
    roomId: oid(args.roomId),
    leftAt: null,
    bannedUntil: null,
  });

  const maxUsers = Number(room.maxUsers ?? 0);
  if (maxUsers > 0 && activeCount >= maxUsers) {
    return { ok: false as const, error: "Room is full" };
  }

  // if room has no active owner, first join becomes OWNER
  const ownerExists = await RoomMemberModel.exists({
    roomId: oid(args.roomId),
    role: "OWNER",
    leftAt: null,
  });

  const role = ownerExists ? "MEMBER" : "OWNER";

  // ✅ set room ownerSessionId when first owner joins
  if (role === "OWNER" && !room.ownerSessionId) {
    await RoomModel.updateOne(
      { _id: oid(args.roomId), ownerSessionId: null },
      { $set: { ownerSessionId: oid(args.sessionId) } }
    );
  }

  const member = await RoomMemberModel.findOneAndUpdate(
    { roomId: oid(args.roomId), sessionId: oid(args.sessionId) },
    {
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
    },
    { upsert: true, new: true }
  ).lean();

  return { ok: true as const, member, role, room };
}

export async function leaveRoom(args: { roomId: string; sessionId: string }) {
  if (!isValidObjectId(args.roomId))
    return { ok: false as const, error: "Invalid roomId" };

  const member = await RoomMemberModel.findOneAndUpdate(
    { roomId: oid(args.roomId), sessionId: oid(args.sessionId) },
    { $set: { leftAt: new Date(), lastSeenAt: new Date() } },
    { new: true }
  ).lean();

  return { ok: true as const, member };
}

export async function listRoomMembers(args: { roomId: string; limit: number }) {
  if (!isValidObjectId(args.roomId))
    return { ok: false as const, error: "Invalid roomId" };

  const members = await RoomMemberModel.find({
    roomId: oid(args.roomId),
    leftAt: null,
  })
    .sort({ role: 1, joinedAt: -1 })
    .limit(args.limit)
    .lean();

  return { ok: true as const, members };
}

async function requireOwner(roomId: string, meSessionId: string) {
  const me = await RoomMemberModel.findOne({
    roomId: oid(roomId),
    sessionId: oid(meSessionId),
    leftAt: null,
  }).lean();

  if (!me) return { ok: false as const, error: "Not in room" };
  if (me.role !== "OWNER") return { ok: false as const, error: "Owner only" };

  return { ok: true as const, me };
}

export async function kickMember(args: {
  roomId: string;
  meSessionId: string;
  targetSessionId: string;
}) {
  if (!isValidObjectId(args.roomId) || !isValidObjectId(args.targetSessionId)) {
    return { ok: false as const, error: "Invalid id(s)" };
  }

  const auth = await requireOwner(args.roomId, args.meSessionId);
  if (!auth.ok) return auth;

  if (args.meSessionId === args.targetSessionId) {
    return { ok: false as const, error: "Owner cannot kick self" };
  }

  const updated = await RoomMemberModel.findOneAndUpdate(
    {
      roomId: oid(args.roomId),
      sessionId: oid(args.targetSessionId),
      leftAt: null,
    },
    {
      $set: {
        kickedAt: new Date(),
        kickedBySessionId: oid(args.meSessionId),
        leftAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  if (!updated)
    return { ok: false as const, error: "Target not found in room" };

  return { ok: true as const, member: updated };
}

export async function banMember(args: {
  roomId: string;
  meSessionId: string;
  targetSessionId: string;
  minutes: number;
}) {
  if (!isValidObjectId(args.roomId) || !isValidObjectId(args.targetSessionId)) {
    return { ok: false as const, error: "Invalid id(s)" };
  }

  const auth = await requireOwner(args.roomId, args.meSessionId);
  if (!auth.ok) return auth;

  if (args.meSessionId === args.targetSessionId) {
    return { ok: false as const, error: "Owner cannot ban self" };
  }

  const mins = Math.max(1, Math.min(60 * 24 * 30, Number(args.minutes || 0)));
  const bannedUntil = new Date(Date.now() + mins * 60_000);

  const updated = await RoomMemberModel.findOneAndUpdate(
    { roomId: oid(args.roomId), sessionId: oid(args.targetSessionId) },
    {
      $set: {
        bannedUntil,
        bannedBySessionId: oid(args.meSessionId),
        leftAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).lean();

  return { ok: true as const, member: updated };
}

export function toRoomMemberResponse(m: any) {
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
