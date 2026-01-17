import Redis, { RedisOptions } from "ioredis";
import { env } from "../config/env";

const isTls = env.REDIS_URL.startsWith("rediss://");

export const redisOptions: RedisOptions = {
  // BullMQ-friendly
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10_000,

  // ✅ TLS only when using rediss://
  tls: isTls ? {} : undefined,

  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
};

export const redis = new Redis(env.REDIS_URL, redisOptions);
export const redisPub = new Redis(env.REDIS_URL, redisOptions);
export const redisSub = new Redis(env.REDIS_URL, redisOptions);

// ✅ attach handlers to ALL clients (prevents "Unhandled error event" spam)
for (const c of [redis, redisPub, redisSub]) {
  c.on("connect", () => console.log("[redis] connect"));
  c.on("ready", () => console.log("[redis] ready"));
  c.on("error", (e) => console.error("[redis] error:", e?.message ?? e));
}
