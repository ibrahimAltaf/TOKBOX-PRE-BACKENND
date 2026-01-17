import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../lib/redis";
import { env } from "../config/env";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./socket.types";

import { getSessionFromSocketReq } from "./auth";
import { SessionModel } from "../modules/sessions/session.model";

import { bindRoomHandlers } from "../realtime/handlers/rooms.handlers";
import { bindMessageHandlers } from "../realtime/handlers/messages.handlers";
import { bindDmHandlers } from "../realtime/handlers/dm.handlers";
import { bindInviteHandlers } from "../realtime/handlers/invites.handlers";
import { bindCallHandlers } from "../realtime/handlers/calls.handlers";
import { bindVideoGroupHandlers } from "../realtime/handlers/videoGroup.handlers";
import {
  markSessionOnline,
  markSessionOffline,
} from "../realtime/presence/online.store";

async function getSessionFromHandshakeAuth(socket: any) {
  const key = String(socket.handshake?.auth?.sessionKey || "").trim();
  if (!key) return null;

  const session = await SessionModel.findOne({
    sessionKey: key,
    endedAt: null,
  })
    .select({ _id: 1, sessionKey: 1 })
    .lean();

  if (!session) return null;

  return { sessionId: String(session._id), sessionKey: key };
}

/** -----------------------------------------
 * Presence stability:
 * - Keep per-session socket count
 * - Only mark offline when count hits 0
 * - Add small delay to avoid flicker on reconnect
 * ----------------------------------------*/
const sessionSockets = new Map<string, Set<string>>();
const offlineTimers = new Map<string, NodeJS.Timeout>();
const OFFLINE_DELAY_MS = 1500;

function addSocket(sessionId: string, socketId: string) {
  let set = sessionSockets.get(sessionId);
  if (!set) {
    set = new Set<string>();
    sessionSockets.set(sessionId, set);
  }
  set.add(socketId);
}

function removeSocket(sessionId: string, socketId: string) {
  const set = sessionSockets.get(sessionId);
  if (!set) return 0;
  set.delete(socketId);
  if (set.size === 0) sessionSockets.delete(sessionId);
  return set.size;
}

function clearOfflineTimer(sessionId: string) {
  const t = offlineTimers.get(sessionId);
  if (t) {
    clearTimeout(t);
    offlineTimers.delete(sessionId);
  }
}

function scheduleOffline(sessionId: string, fn: () => Promise<void>) {
  clearOfflineTimer(sessionId);
  const t = setTimeout(async () => {
    offlineTimers.delete(sessionId);

    // still zero sockets?
    const set = sessionSockets.get(sessionId);
    if (set && set.size > 0) return;

    await fn();
  }, OFFLINE_DELAY_MS);

  offlineTimers.set(sessionId, t);
}

export function initSocket(server: http.Server) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >(server, {
    cors: {
      // allow any origin + credentials
      origin: (_origin, cb) => cb(null, true),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Redis adapter (scaling)
  const pub = redis;
  const sub = redis.duplicate();
  io.adapter(createAdapter(pub, sub));

  io.use(async (socket, next) => {
    try {
      const origin = socket.request?.headers?.origin;
      const cookieHeader = socket.request?.headers?.cookie || "";
      const handshakeKey = String(socket.handshake?.auth?.sessionKey || "").trim();

      console.log("[socket-auth] origin:", origin);
      console.log("[socket-auth] cookieHeader:", cookieHeader ? "(present)" : "(none)");
      console.log(
        "[socket-auth] handshakeKey:",
        handshakeKey ? `${handshakeKey.slice(0, 6)}...` : "(none)"
      );

      // 1) cookie-based
      let s = await getSessionFromSocketReq(socket.request);
      console.log("[socket-auth] cookie-based", s ? `OK: ${s.sessionId}` : "MISS");

      // 2) handshake-based
      if (!s) {
        s = await getSessionFromHandshakeAuth(socket);
        console.log("[socket-auth] handshake-based", s ? `OK: ${s.sessionId}` : "MISS");
      }

      if (!s) return next(new Error("UNAUTHORIZED"));

      socket.data.sessionId = s.sessionId;
      socket.data.sessionKey = s.sessionKey;

      socket.join(`session:${s.sessionId}`);
      return next();
    } catch (e: any) {
      console.log("[socket-auth] ERROR:", e?.message || e);
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", async (socket) => {
    const sessionId = socket.data.sessionId;

    console.log("[socket] connected:", socket.id, "sessionId:", sessionId);

    // ✅ presence: add socket + cancel offline timer
    addSocket(sessionId, socket.id);
    clearOfflineTimer(sessionId);

    // ✅ mark online only once (first socket)
    if (sessionSockets.get(sessionId)?.size === 1) {
      try {
        await markSessionOnline(sessionId);
      } catch (e: any) {
        console.log("[presence] markSessionOnline failed:", e?.message || e);
      }
    }

    bindRoomHandlers(io, socket);
    bindMessageHandlers(io, socket);
    bindDmHandlers(io, socket);
    bindInviteHandlers(io, socket);
    bindCallHandlers(io, socket);
    bindVideoGroupHandlers(io, socket);

    socket.on("disconnect", async () => {
      console.log("[socket] disconnected:", socket.id, "sessionId:", sessionId);

      const left = removeSocket(sessionId, socket.id);

      // ✅ only offline when no sockets remain (with small delay)
      if (left === 0) {
        scheduleOffline(sessionId, async () => {
          try {
            await markSessionOffline(sessionId);
          } catch (e: any) {
            console.log("[presence] markSessionOffline failed:", e?.message || e);
          }
        });
      }
    });
  });

  return io;
}
