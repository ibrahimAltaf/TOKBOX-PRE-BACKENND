import crypto from "crypto";
import { nanoid } from "nanoid";
import type { Request } from "express";
import mongoose from "mongoose";
import { SessionModel } from "../session.model";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function getClientIp(req: Request): string | null {
  const xf = (req.headers["x-forwarded-for"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  return xf || req.socket.remoteAddress || null;
}

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

export async function ensureSession(args: {
  sessionKey?: string | null;
  ip?: string | null;
  fingerprint?: string | null;

  nickname?: string;
  about?: string;
  avatarUrl?: string;

  // ✅ added
  photos?: string[];
  introVideoUrl?: string;
}) {
  const key = (args.sessionKey ?? "").trim() || nanoid(32);

  const ipHash = args.ip ? sha256(args.ip) : null;
  const fingerprintHash = args.fingerprint ? sha256(args.fingerprint) : null;
  const now = new Date();

  const existing = await SessionModel.findOne({ sessionKey: key });

  if (existing) {
    if (existing.endedAt) existing.endedAt = null;
    existing.lastSeenAt = now;

    if (args.nickname !== undefined) existing.nickname = args.nickname;
    if (args.about !== undefined) existing.about = args.about;
    if (args.avatarUrl !== undefined) existing.avatarUrl = args.avatarUrl;

    // ✅ optional
    if (args.photos !== undefined) (existing as any).photos = args.photos ?? [];
    if (args.introVideoUrl !== undefined) {
      (existing as any).introVideoUrl = args.introVideoUrl ?? null;
    }

    if (!existing.ipHash && ipHash) existing.ipHash = ipHash;
    if (!existing.fingerprintHash && fingerprintHash) {
      existing.fingerprintHash = fingerprintHash;
    }

    await existing.save();
    return existing;
  }

  const created = await SessionModel.create({
    sessionKey: key,
    nickname: args.nickname ?? null,
    about: args.about ?? null,
    avatarUrl: args.avatarUrl ?? null,
    avatarMediaId: null,

    // ✅ optional
    photos: args.photos ?? [],
    photoMediaIds: [],
    introVideoUrl: args.introVideoUrl ?? null,
    introVideoMediaId: null,

    ipHash,
    fingerprintHash,
    lastSeenAt: now,
    endedAt: null,
    isOnline: false,
  });

  return created;
}

export async function getSessionByKey(sessionKey: string) {
  return SessionModel.findOne({ sessionKey, endedAt: null });
}

export async function updateMe(args: {
  sessionKey: string;

  nickname?: string;
  about?: string;
  avatarUrl?: string;
  avatarMediaId?: string;

  // ✅ added
  photos?: string[];
  photoMediaIds?: string[];
  introVideoUrl?: string;
  introVideoMediaId?: string;
}) {
  const s = await getSessionByKey(args.sessionKey);
  if (!s) return null;

  if (args.nickname !== undefined) s.nickname = args.nickname;
  if (args.about !== undefined) s.about = args.about;
  if (args.avatarUrl !== undefined) s.avatarUrl = args.avatarUrl;

  if (args.avatarMediaId !== undefined) {
    (s as any).avatarMediaId =
      args.avatarMediaId && isValidObjectId(args.avatarMediaId)
        ? new mongoose.Types.ObjectId(args.avatarMediaId)
        : null;
  }

  // ✅ gallery urls
  if (args.photos !== undefined) (s as any).photos = args.photos ?? [];

  // ✅ gallery ids
  if (args.photoMediaIds !== undefined) {
    (s as any).photoMediaIds = (args.photoMediaIds ?? [])
      .filter(isValidObjectId)
      .map((id) => new mongoose.Types.ObjectId(id));
  }

  // ✅ intro video url
  if (args.introVideoUrl !== undefined) {
    (s as any).introVideoUrl = args.introVideoUrl ?? null;
  }

  // ✅ intro video id
  if (args.introVideoMediaId !== undefined) {
    (s as any).introVideoMediaId =
      args.introVideoMediaId && isValidObjectId(args.introVideoMediaId)
        ? new mongoose.Types.ObjectId(args.introVideoMediaId)
        : null;
  }

  s.lastSeenAt = new Date();
  await s.save();
  return s;
}

export async function endSession(sessionKey: string) {
  const s = await SessionModel.findOne({ sessionKey });
  if (!s) return null;

  s.endedAt = new Date();
  s.isOnline = false;
  await s.save();
  return s;
}

export function toSessionResponse(s: any) {
  return {
    id: String(s._id),
    sessionKey: s.sessionKey,
    nickname: s.nickname,
    about: s.about,
    avatarUrl: s.avatarUrl,
    avatarMediaId: s.avatarMediaId ? String(s.avatarMediaId) : null,

    // ✅ added
    photos: s.photos ?? [],
    photoMediaIds: (s.photoMediaIds ?? []).map((x: any) => String(x)),
    introVideoUrl: s.introVideoUrl ?? null,
    introVideoMediaId: s.introVideoMediaId ? String(s.introVideoMediaId) : null,

    lastSeenAt: s.lastSeenAt,
    endedAt: s.endedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
