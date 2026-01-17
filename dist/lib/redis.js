"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redisPub = exports.redis = exports.redisOptions = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const isTls = env_1.env.REDIS_URL.startsWith("rediss://");
exports.redisOptions = {
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
exports.redis = new ioredis_1.default(env_1.env.REDIS_URL, exports.redisOptions);
exports.redisPub = new ioredis_1.default(env_1.env.REDIS_URL, exports.redisOptions);
exports.redisSub = new ioredis_1.default(env_1.env.REDIS_URL, exports.redisOptions);
// ✅ attach handlers to ALL clients (prevents "Unhandled error event" spam)
for (const c of [exports.redis, exports.redisPub, exports.redisSub]) {
    c.on("connect", () => console.log("[redis] connect"));
    c.on("ready", () => console.log("[redis] ready"));
    c.on("error", (e) => console.error("[redis] error:", e?.message ?? e));
}
