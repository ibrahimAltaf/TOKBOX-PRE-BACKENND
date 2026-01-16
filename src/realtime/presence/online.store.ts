import { redis } from "../../lib/redis";

const ONLINE_ZSET = "online:sessions:z"; // member=sessionId score=lastSeenMs
const SOCKCOUNT_KEY = (sessionId: string) => `online:sockcount:${sessionId}`;

/**
 * Multi-tab safe:
 * - each socket connect increments sockcount
 * - disconnect decrements; only when 0 => remove from global online index
 * Also keeps stable ordering via ZSET score.
 */
export async function markSessionOnline(sessionId: string) {
  const n = await redis.incr(SOCKCOUNT_KEY(sessionId));
  const now = Date.now();

  const pipe = redis.pipeline();
  // always update lastSeen score for ordering
  pipe.zadd(ONLINE_ZSET, String(now), sessionId);
  await pipe.exec();

  return n;
}

export async function markSessionOffline(sessionId: string) {
  const n = await redis.decr(SOCKCOUNT_KEY(sessionId));

  if (n <= 0) {
    const pipe = redis.pipeline();
    pipe.del(SOCKCOUNT_KEY(sessionId));
    pipe.zrem(ONLINE_ZSET, sessionId);
    await pipe.exec();
  }
}

export async function listOnlineSessionIds(args: {
  limit: number;
  cursor?: string; // cursor = score(ms) as string
}) {
  const limit = Math.max(1, Math.min(500, Number(args.limit || 50)));
  const max = args.cursor ? `(${args.cursor}` : "+inf";

  /**
   * ioredis TS typings often don't include the overload with WITHSCORES+LIMIT,
   * so we cast the call to any while keeping runtime correct.
   *
   * IMPORTANT: order matters => WITHSCORES then LIMIT.
   */
  const rows = (await (redis as any).zrevrangebyscore(
    ONLINE_ZSET,
    max,
    "-inf",
    "WITHSCORES",
    "LIMIT",
    0,
    limit
  )) as string[];

  const sessionIds: string[] = [];
  const scores: string[] = [];

  for (let i = 0; i < rows.length; i += 2) {
    sessionIds.push(rows[i]);
    scores.push(rows[i + 1]);
  }

  const nextCursor = scores.length ? scores[scores.length - 1] : null;

  return { sessionIds, nextCursor };
}

export async function isSessionOnline(sessionId: string) {
  const score = await redis.zscore(ONLINE_ZSET, sessionId);
  return score !== null;
}

export async function onlineCount() {
  return redis.zcard(ONLINE_ZSET);
}
