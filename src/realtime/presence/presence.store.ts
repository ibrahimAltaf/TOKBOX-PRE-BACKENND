import { redis } from "../../lib/redis";

const roomKey = (roomId: string) => `room:${roomId}:online`;
const sessionRoomsKey = (sessionId: string) => `session:${sessionId}:rooms`;

export async function addToRoomPresence(roomId: string, sessionId: string) {
  await redis.sadd(roomKey(roomId), sessionId);
  await redis.sadd(sessionRoomsKey(sessionId), roomId);
}

export async function removeFromRoomPresence(
  roomId: string,
  sessionId: string
) {
  await redis.srem(roomKey(roomId), sessionId);
  await redis.srem(sessionRoomsKey(sessionId), roomId);
}

export async function listRoomPresence(roomId: string) {
  return redis.smembers(roomKey(roomId));
}

export async function listSessionRooms(sessionId: string) {
  return redis.smembers(sessionRoomsKey(sessionId));
}

export async function cleanupSessionPresence(sessionId: string) {
  const rooms = await listSessionRooms(sessionId);
  if (!rooms.length) return rooms;

  const pipe = redis.pipeline();
  for (const roomId of rooms) pipe.srem(roomKey(roomId), sessionId);
  pipe.del(sessionRoomsKey(sessionId));
  await pipe.exec();

  return rooms; // string[] roomIds
}
