import { redis } from "../../lib/redis";

const ONLINE_SET = "online:sessions";
const SOCKCOUNT_KEY = (sessionId: string) => `online:sockcount:${sessionId}`;

/**
 * Multi-tab safe:
 * - each socket connect increments sockcount
 * - disconnect decrements; only when 0 => remove from ONLINE_SET
 */
export async function markSessionOnline(sessionId: string) {
  const n = await redis.incr(SOCKCOUNT_KEY(sessionId));
  if (n === 1) {
    await redis.sadd(ONLINE_SET, sessionId);
  }
}

export async function markSessionOffline(sessionId: string) {
  const n = await redis.decr(SOCKCOUNT_KEY(sessionId));
  if (n <= 0) {
    const pipe = redis.pipeline();
    pipe.del(SOCKCOUNT_KEY(sessionId));
    pipe.srem(ONLINE_SET, sessionId);
    await pipe.exec();
  }
}

export async function listOnlineSessionIds(args: {
  limit: number;
  cursor?: string; // sessionId cursor (string)
}) {
  // NOTE: Redis set has no stable order; for now we do simple pagination
  // Use SSCAN for cursor-based traversal.
  const count = Math.max(1, Math.min(500, args.limit || 50));

  const [nextCursor, ids] = await redis.sscan(
    ONLINE_SET,
    args.cursor ?? "0",
    "COUNT",
    String(count)
  );

  return {
    sessionIds: ids,
    nextCursor: nextCursor === "0" ? null : nextCursor,
  };
}

export async function isSessionOnline(sessionId: string) {
  const v = await redis.sismember(ONLINE_SET, sessionId);
  return v === 1;
}

export async function onlineCount() {
  return redis.scard(ONLINE_SET);
}
