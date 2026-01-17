"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newCallId = newCallId;
exports.getInCall = getInCall;
exports.setInCall = setInCall;
exports.clearInCall = clearInCall;
exports.createCall = createCall;
exports.getCall = getCall;
exports.updateCall = updateCall;
exports.endCall = endCall;
const redis_1 = require("../../lib/redis");
const crypto_1 = __importDefault(require("crypto"));
const callKey = (callId) => `call:${callId}`;
const inCallKey = (sessionId) => `call:in:${sessionId}`; // value=callId
function newCallId() {
    return crypto_1.default.randomBytes(12).toString("base64url");
}
async function getInCall(sessionId) {
    return redis_1.redis.get(inCallKey(sessionId));
}
async function setInCall(sessionId, callId) {
    await redis_1.redis.set(inCallKey(sessionId), callId);
}
async function clearInCall(sessionId, callId) {
    const current = await redis_1.redis.get(inCallKey(sessionId));
    if (current === callId)
        await redis_1.redis.del(inCallKey(sessionId));
}
async function createCall(args) {
    const id = newCallId();
    const call = {
        id,
        fromSessionId: args.fromSessionId,
        toSessionId: args.toSessionId,
        roomId: args.roomId ?? null,
        status: "RINGING",
        createdAt: new Date().toISOString(),
        acceptedAt: null,
        endedAt: null,
    };
    const pipe = redis_1.redis.pipeline();
    pipe.set(callKey(id), JSON.stringify(call), "EX", args.ttlSeconds);
    // mark both as "in call" immediately to prevent double calls
    pipe.set(inCallKey(args.fromSessionId), id, "EX", args.ttlSeconds);
    pipe.set(inCallKey(args.toSessionId), id, "EX", args.ttlSeconds);
    await pipe.exec();
    return call;
}
async function getCall(callId) {
    const raw = await redis_1.redis.get(callKey(callId));
    return raw ? JSON.parse(raw) : null;
}
async function updateCall(callId, patch, ttlSeconds) {
    const cur = await getCall(callId);
    if (!cur)
        return null;
    const next = { ...cur, ...patch };
    await redis_1.redis.set(callKey(callId), JSON.stringify(next), "EX", ttlSeconds);
    return next;
}
async function endCall(args) {
    const cur = await getCall(args.callId);
    if (!cur)
        return null;
    const ended = await updateCall(args.callId, {
        status: "ENDED",
        endedAt: new Date().toISOString(),
    }, args.ttlSeconds);
    // clear inCall for both
    await Promise.all([
        clearInCall(cur.fromSessionId, args.callId),
        clearInCall(cur.toSessionId, args.callId),
    ]);
    return ended;
}
