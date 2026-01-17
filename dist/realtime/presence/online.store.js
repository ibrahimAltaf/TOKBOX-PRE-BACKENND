"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSessionOnline = markSessionOnline;
exports.markSessionOffline = markSessionOffline;
exports.listOnlineSessionIds = listOnlineSessionIds;
exports.isSessionOnline = isSessionOnline;
exports.onlineCount = onlineCount;
const redis_1 = require("../../lib/redis");
const ONLINE_ZSET = "online:sessions:z"; // member=sessionId score=lastSeenMs
const SOCKCOUNT_KEY = (sessionId) => `online:sockcount:${sessionId}`;
/**
 * Multi-tab safe:
 * - each socket connect increments sockcount
 * - disconnect decrements; only when 0 => remove from global online index
 * Also keeps stable ordering via ZSET score.
 */
async function markSessionOnline(sessionId) {
    const n = await redis_1.redis.incr(SOCKCOUNT_KEY(sessionId));
    const now = Date.now();
    const pipe = redis_1.redis.pipeline();
    // always update lastSeen score for ordering
    pipe.zadd(ONLINE_ZSET, String(now), sessionId);
    await pipe.exec();
    return n;
}
async function markSessionOffline(sessionId) {
    const n = await redis_1.redis.decr(SOCKCOUNT_KEY(sessionId));
    if (n <= 0) {
        const pipe = redis_1.redis.pipeline();
        pipe.del(SOCKCOUNT_KEY(sessionId));
        pipe.zrem(ONLINE_ZSET, sessionId);
        await pipe.exec();
    }
}
async function listOnlineSessionIds(args) {
    const limit = Math.max(1, Math.min(500, Number(args.limit || 50)));
    const max = args.cursor ? `(${args.cursor}` : "+inf";
    /**
     * ioredis TS typings often don't include the overload with WITHSCORES+LIMIT,
     * so we cast the call to any while keeping runtime correct.
     *
     * IMPORTANT: order matters => WITHSCORES then LIMIT.
     */
    const rows = (await redis_1.redis.zrevrangebyscore(ONLINE_ZSET, max, "-inf", "WITHSCORES", "LIMIT", 0, limit));
    const sessionIds = [];
    const scores = [];
    for (let i = 0; i < rows.length; i += 2) {
        sessionIds.push(rows[i]);
        scores.push(rows[i + 1]);
    }
    const nextCursor = scores.length ? scores[scores.length - 1] : null;
    return { sessionIds, nextCursor };
}
async function isSessionOnline(sessionId) {
    const score = await redis_1.redis.zscore(ONLINE_ZSET, sessionId);
    return score !== null;
}
async function onlineCount() {
    return redis_1.redis.zcard(ONLINE_ZSET);
}
