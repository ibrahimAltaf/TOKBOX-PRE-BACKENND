// src/modules/invites/service/invites.service.ts
import crypto from "crypto";
import mongoose from "mongoose";
import { InviteModel } from "../invite.model";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

function makeToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function now() {
  return new Date();
}

function isExpired(inv: any) {
  return inv.expiresAt && new Date(inv.expiresAt).getTime() <= Date.now();
}

export async function createInvite(args: {
  inviterSessionId: string;
  kind: "ROOM" | "DM" | "VIDEO_GROUP" | "VIDEO_1ON1";
  roomId?: string;
  dmThreadId?: string;
  targetSessionId?: string;
  maxUses: number;
  ttlMinutes?: number;
}) {
  if (!isValidObjectId(args.inviterSessionId)) {
    return { ok: false as const, error: "Invalid inviterSessionId" };
  }

  if (args.kind === "ROOM" || args.kind === "VIDEO_GROUP" || args.kind === "VIDEO_1ON1") {
    if (!args.roomId || !isValidObjectId(args.roomId)) {
      return { ok: false as const, error: "roomId is required for this kind" };
    }
  }

  if (args.kind === "DM") {
    if (!args.dmThreadId || !isValidObjectId(args.dmThreadId)) {
      return { ok: false as const, error: "dmThreadId is required for DM kind" };
    }
  }

  if (args.targetSessionId && !isValidObjectId(args.targetSessionId)) {
    return { ok: false as const, error: "Invalid targetSessionId" };
  }

  const token = makeToken();

  const expiresAt =
    typeof args.ttlMinutes === "number"
      ? new Date(Date.now() + args.ttlMinutes * 60_000)
      : null;

  const maxUses = Math.max(1, Math.min(50, Number(args.maxUses || 1)));

  const doc = await InviteModel.create({
    token,
    kind: args.kind,

    inviterSessionId: new mongoose.Types.ObjectId(args.inviterSessionId),
    targetSessionId: args.targetSessionId
      ? new mongoose.Types.ObjectId(args.targetSessionId)
      : null,

    roomId: args.roomId ? new mongoose.Types.ObjectId(args.roomId) : null,
    dmThreadId: args.dmThreadId ? new mongoose.Types.ObjectId(args.dmThreadId) : null,

    status: "PENDING",
    maxUses,
    uses: 0,

    expiresAt,
    acceptedAt: null,
    acceptedBySessionId: null,
    revokedAt: null,
  });

  return { ok: true as const, invite: doc.toObject() };
}

export async function listIncomingInvites(args: { meSessionId: string; limit: number }) {
  if (!isValidObjectId(args.meSessionId)) {
    return { ok: false as const, error: "Invalid meSessionId" };
  }

  const limit = Math.max(1, Math.min(50, Number(args.limit || 20)));

  const invites = await InviteModel.find({
    targetSessionId: new mongoose.Types.ObjectId(args.meSessionId),
    status: "PENDING",
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return { ok: true as const, invites };
}

export async function getInviteByToken(token: string) {
  const inv = await InviteModel.findOne({ token }).lean();
  if (!inv) return { ok: false as const, error: "Invite not found" };

  if (inv.status !== "PENDING")
    return { ok: false as const, error: `Invite is ${inv.status}` };

  if (isExpired(inv)) {
    await InviteModel.updateOne({ _id: inv._id }, { $set: { status: "EXPIRED" } });
    return { ok: false as const, error: "Invite expired" };
  }

  if (inv.maxUses && inv.uses >= inv.maxUses) {
    await InviteModel.updateOne({ _id: inv._id }, { $set: { status: "EXPIRED" } });
    return { ok: false as const, error: "Invite max uses reached" };
  }

  return { ok: true as const, invite: inv };
}

export async function acceptInvite(args: { meSessionId: string; token: string }) {
  if (!isValidObjectId(args.meSessionId)) {
    return { ok: false as const, error: "Invalid meSessionId" };
  }

  const inv = await InviteModel.findOne({ token: args.token });
  if (!inv) return { ok: false as const, error: "Invite not found" };

  if (inv.status !== "PENDING")
    return { ok: false as const, error: `Invite is ${inv.status}` };

  if (isExpired(inv)) {
    inv.status = "EXPIRED";
    await inv.save();
    return { ok: false as const, error: "Invite expired" };
  }

  if (inv.targetSessionId && String(inv.targetSessionId) !== args.meSessionId) {
    return { ok: false as const, error: "Invite is not for this user" };
  }

  if (inv.maxUses && inv.uses >= inv.maxUses) {
    inv.status = "EXPIRED";
    await inv.save();
    return { ok: false as const, error: "Invite max uses reached" };
  }

  inv.uses += 1;
  inv.acceptedAt = now();
  inv.acceptedBySessionId = new mongoose.Types.ObjectId(args.meSessionId);

  // if it is 1-use, mark ACCEPTED; if multi-use, keep PENDING
  if (inv.maxUses && inv.uses >= inv.maxUses) inv.status = "ACCEPTED";
  else inv.status = "PENDING";

  await inv.save();

  return { ok: true as const, invite: inv.toObject() };
}

export async function revokeInvite(args: { meSessionId: string; token: string }) {
  if (!isValidObjectId(args.meSessionId)) {
    return { ok: false as const, error: "Invalid meSessionId" };
  }

  const inv = await InviteModel.findOne({ token: args.token });
  if (!inv) return { ok: false as const, error: "Invite not found" };

  if (String(inv.inviterSessionId) !== args.meSessionId) {
    return { ok: false as const, error: "Forbidden" };
  }

  if (inv.status !== "PENDING") {
    return { ok: false as const, error: `Invite is ${inv.status}` };
  }

  inv.status = "REVOKED";
  inv.revokedAt = now();
  await inv.save();

  return { ok: true as const, invite: inv.toObject() };
}

export function toInviteResponse(inv: any) {
  return {
    id: String(inv._id),
    token: inv.token,
    kind: inv.kind,
    inviterSessionId: String(inv.inviterSessionId),
    targetSessionId: inv.targetSessionId ? String(inv.targetSessionId) : null,
    roomId: inv.roomId ? String(inv.roomId) : null,
    dmThreadId: inv.dmThreadId ? String(inv.dmThreadId) : null,
    status: inv.status,
    maxUses: inv.maxUses,
    uses: inv.uses,
    expiresAt: inv.expiresAt,
    acceptedAt: inv.acceptedAt,
    acceptedBySessionId: inv.acceptedBySessionId ? String(inv.acceptedBySessionId) : null,
    revokedAt: inv.revokedAt,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}
