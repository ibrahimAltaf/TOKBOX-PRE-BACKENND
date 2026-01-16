import { redis } from "../../lib/redis";
import crypto from "crypto";

export type VideoGroupState = {
  id: string; // same as roomId (recommended) or separate session id
  roomId: string;
  ownerSessionId: string;
  status: "ACTIVE" | "ENDED";
  createdAt: string;
  endedAt: string | null;
  maxUsers: number; // effective cap
};

const vgKey = (roomId: string) => `vg:${roomId}`;
const vgMembersKey = (roomId: string) => `vg:${roomId}:members`; // set(sessionIds)

export function newToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export async function getVideoGroup(roomId: string): Promise<VideoGroupState | null> {
  const raw = await redis.get(vgKey(roomId));
  return raw ? (JSON.parse(raw) as VideoGroupState) : null;
}

export async function setVideoGroup(roomId: string, state: VideoGroupState, ttlSeconds = 60 * 60) {
  await redis.set(vgKey(roomId), JSON.stringify(state), "EX", ttlSeconds);
}

export async function endVideoGroup(roomId: string) {
  const cur = await getVideoGroup(roomId);
  if (!cur) return null;

  const next: VideoGroupState = {
    ...cur,
    status: "ENDED",
    endedAt: new Date().toISOString(),
  };

  // keep short TTL for debugging
  await redis.set(vgKey(roomId), JSON.stringify(next), "EX", 120);
  await redis.del(vgMembersKey(roomId));

  return next;
}

export async function addMember(roomId: string, sessionId: string) {
  await redis.sadd(vgMembersKey(roomId), sessionId);
}

export async function removeMember(roomId: string, sessionId: string) {
  await redis.srem(vgMembersKey(roomId), sessionId);
}

export async function listMembers(roomId: string) {
  return redis.smembers(vgMembersKey(roomId));
}

export async function memberCount(roomId: string) {
  return redis.scard(vgMembersKey(roomId));
}
