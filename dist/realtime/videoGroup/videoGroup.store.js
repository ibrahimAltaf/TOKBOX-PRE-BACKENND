"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newToken = newToken;
exports.getVideoGroup = getVideoGroup;
exports.setVideoGroup = setVideoGroup;
exports.endVideoGroup = endVideoGroup;
exports.addMember = addMember;
exports.removeMember = removeMember;
exports.listMembers = listMembers;
exports.memberCount = memberCount;
const redis_1 = require("../../lib/redis");
const crypto_1 = __importDefault(require("crypto"));
const vgKey = (roomId) => `vg:${roomId}`;
const vgMembersKey = (roomId) => `vg:${roomId}:members`; // set(sessionIds)
function newToken() {
    return crypto_1.default.randomBytes(18).toString("base64url");
}
async function getVideoGroup(roomId) {
    const raw = await redis_1.redis.get(vgKey(roomId));
    return raw ? JSON.parse(raw) : null;
}
async function setVideoGroup(roomId, state, ttlSeconds = 60 * 60) {
    await redis_1.redis.set(vgKey(roomId), JSON.stringify(state), "EX", ttlSeconds);
}
async function endVideoGroup(roomId) {
    const cur = await getVideoGroup(roomId);
    if (!cur)
        return null;
    const next = {
        ...cur,
        status: "ENDED",
        endedAt: new Date().toISOString(),
    };
    // keep short TTL for debugging
    await redis_1.redis.set(vgKey(roomId), JSON.stringify(next), "EX", 120);
    await redis_1.redis.del(vgMembersKey(roomId));
    return next;
}
async function addMember(roomId, sessionId) {
    await redis_1.redis.sadd(vgMembersKey(roomId), sessionId);
}
async function removeMember(roomId, sessionId) {
    await redis_1.redis.srem(vgMembersKey(roomId), sessionId);
}
async function listMembers(roomId) {
    return redis_1.redis.smembers(vgMembersKey(roomId));
}
async function memberCount(roomId) {
    return redis_1.redis.scard(vgMembersKey(roomId));
}
