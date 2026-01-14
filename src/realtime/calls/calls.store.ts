import { redis } from "../../lib/redis";
import crypto from "crypto";

type CallState = {
  id: string;
  fromSessionId: string;
  toSessionId: string;
  roomId: string | null;
  status: "RINGING" | "ACTIVE" | "ENDED";
  createdAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
};

const callKey = (callId: string) => `call:${callId}`;
const inCallKey = (sessionId: string) => `call:in:${sessionId}`; // value=callId

export function newCallId() {
  return crypto.randomBytes(12).toString("base64url");
}

export async function getInCall(sessionId: string) {
  return redis.get(inCallKey(sessionId));
}

export async function setInCall(sessionId: string, callId: string) {
  await redis.set(inCallKey(sessionId), callId);
}

export async function clearInCall(sessionId: string, callId: string) {
  const current = await redis.get(inCallKey(sessionId));
  if (current === callId) await redis.del(inCallKey(sessionId));
}

export async function createCall(args: {
  fromSessionId: string;
  toSessionId: string;
  roomId?: string | null;
  ttlSeconds: number;
}) {
  const id = newCallId();

  const call: CallState = {
    id,
    fromSessionId: args.fromSessionId,
    toSessionId: args.toSessionId,
    roomId: args.roomId ?? null,
    status: "RINGING",
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    endedAt: null,
  };

  const pipe = redis.pipeline();
  pipe.set(callKey(id), JSON.stringify(call), "EX", args.ttlSeconds);

  // mark both as "in call" immediately to prevent double calls
  pipe.set(inCallKey(args.fromSessionId), id, "EX", args.ttlSeconds);
  pipe.set(inCallKey(args.toSessionId), id, "EX", args.ttlSeconds);

  await pipe.exec();

  return call;
}

export async function getCall(callId: string): Promise<CallState | null> {
  const raw = await redis.get(callKey(callId));
  return raw ? (JSON.parse(raw) as CallState) : null;
}

export async function updateCall(
  callId: string,
  patch: Partial<CallState>,
  ttlSeconds: number
) {
  const cur = await getCall(callId);
  if (!cur) return null;

  const next: CallState = { ...cur, ...patch };
  await redis.set(callKey(callId), JSON.stringify(next), "EX", ttlSeconds);
  return next;
}

export async function endCall(args: {
  callId: string;
  bySessionId?: string | null;
  reason: string;
  ttlSeconds: number;
}) {
  const cur = await getCall(args.callId);
  if (!cur) return null;

  const ended = await updateCall(
    args.callId,
    {
      status: "ENDED",
      endedAt: new Date().toISOString(),
    },
    args.ttlSeconds
  );

  // clear inCall for both
  await Promise.all([
    clearInCall(cur.fromSessionId, args.callId),
    clearInCall(cur.toSessionId, args.callId),
  ]);

  return ended;
}
