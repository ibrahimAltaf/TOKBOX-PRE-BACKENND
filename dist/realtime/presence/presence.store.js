"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToRoomPresence = addToRoomPresence;
exports.removeFromRoomPresence = removeFromRoomPresence;
exports.listRoomPresence = listRoomPresence;
exports.listSessionRooms = listSessionRooms;
exports.cleanupSessionPresence = cleanupSessionPresence;
const redis_1 = require("../../lib/redis");
const roomKey = (roomId) => `room:${roomId}:online`;
const sessionRoomsKey = (sessionId) => `session:${sessionId}:rooms`;
async function addToRoomPresence(roomId, sessionId) {
    await redis_1.redis.sadd(roomKey(roomId), sessionId);
    await redis_1.redis.sadd(sessionRoomsKey(sessionId), roomId);
}
async function removeFromRoomPresence(roomId, sessionId) {
    await redis_1.redis.srem(roomKey(roomId), sessionId);
    await redis_1.redis.srem(sessionRoomsKey(sessionId), roomId);
}
async function listRoomPresence(roomId) {
    return redis_1.redis.smembers(roomKey(roomId));
}
async function listSessionRooms(sessionId) {
    return redis_1.redis.smembers(sessionRoomsKey(sessionId));
}
async function cleanupSessionPresence(sessionId) {
    const rooms = await listSessionRooms(sessionId);
    if (!rooms.length)
        return rooms;
    const pipe = redis_1.redis.pipeline();
    for (const roomId of rooms)
        pipe.srem(roomKey(roomId), sessionId);
    pipe.del(sessionRoomsKey(sessionId));
    await pipe.exec();
    return rooms; // string[] roomIds
}
