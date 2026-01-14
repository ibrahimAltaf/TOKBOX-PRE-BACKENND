import Redis, { RedisOptions } from "ioredis";
import { env } from "../config/env";

const isTls = env.REDIS_URL.startsWith("rediss://");

export const redisOptions: RedisOptions = {
  // BullMQ-friendly
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10_000,

  // DO Managed Redis uses TLS via rediss://
  tls: isTls ? {} : undefined,

  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
};

export const redis = new Redis(env.REDIS_URL, redisOptions);

// Optional: dedicated pub/sub clients for Socket.IO adapter (later scaling)
export const redisPub = new Redis(env.REDIS_URL, redisOptions);
export const redisSub = new Redis(env.REDIS_URL, redisOptions);

redis.on("connect", () => console.log("[redis] connected"));
redis.on("ready", () => console.log("[redis] ready"));
redis.on("error", (e) => console.error("[redis] error:", e.message));
