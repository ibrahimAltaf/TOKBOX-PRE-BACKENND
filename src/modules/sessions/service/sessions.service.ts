import crypto from "crypto";
import { nanoid } from "nanoid";
import type { Request } from "express";
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

export async function ensureSession(args: {
  sessionKey?: string | null;
  ip?: string | null;
  fingerprint?: string | null;
  nickname?: string;
  about?: string;
  avatarUrl?: string;
}) {
  const key = (args.sessionKey ?? "").trim() || nanoid(32);

  const ipHash = args.ip ? sha256(args.ip) : null;
  const fingerprintHash = args.fingerprint ? sha256(args.fingerprint) : null;
  const now = new Date();

  const existing = await SessionModel.findOne({ sessionKey: key });

  if (existing) {
    if (existing.endedAt) existing.endedAt = null; // revive if ended
    existing.lastSeenAt = now;

    if (args.nickname !== undefined) existing.nickname = args.nickname;
    if (args.about !== undefined) existing.about = args.about;
    if (args.avatarUrl !== undefined) existing.avatarUrl = args.avatarUrl;

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
}) {
  const s = await getSessionByKey(args.sessionKey);
  if (!s) return null;

  if (args.nickname !== undefined) s.nickname = args.nickname;
  if (args.about !== undefined) s.about = args.about;
  if (args.avatarUrl !== undefined) s.avatarUrl = args.avatarUrl;

  // avatarMediaId is optional, only if you have a Media module later
  if (args.avatarMediaId !== undefined) {
    // Keep as string; mongoose will cast if valid ObjectId
    (s as any).avatarMediaId = args.avatarMediaId || null;
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
    lastSeenAt: s.lastSeenAt,
    endedAt: s.endedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
