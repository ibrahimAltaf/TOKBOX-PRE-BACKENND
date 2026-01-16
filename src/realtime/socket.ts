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

export function initSocket(server: http.Server) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Redis adapter (for scaling across multiple Node instances)
  const pub = redis;
  const sub = redis.duplicate();
  io.adapter(createAdapter(pub, sub));

  io.use(async (socket, next) => {
    try {
      const origin = socket.request?.headers?.origin;
      const cookieHeader = socket.request?.headers?.cookie || "";
      const handshakeKey = String(
        socket.handshake?.auth?.sessionKey || ""
      ).trim();

      console.log("[socket-auth] origin:", origin);
      console.log(
        "[socket-auth] cookieHeader:",
        cookieHeader ? "(present)" : "(none)"
      );
      console.log(
        "[socket-auth] handshakeKey:",
        handshakeKey ? `${handshakeKey.slice(0, 6)}...` : "(none)"
      );

      // 1) cookie-based
      let s = await getSessionFromSocketReq(socket.request);

      if (s) {
        console.log("[socket-auth] cookie-based OK:", s.sessionId);
      } else {
        console.log("[socket-auth] cookie-based MISS");
      }

      // 2) handshake auth fallback
      if (!s) {
        s = await getSessionFromHandshakeAuth(socket);
        if (s) console.log("[socket-auth] handshake-based OK:", s.sessionId);
        else console.log("[socket-auth] handshake-based MISS");
      }

      if (!s) {
        console.log("[socket-auth] UNAUTHORIZED (no session)");
        return next(new Error("UNAUTHORIZED"));
      }

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
    console.log(
      "[socket] connected:",
      socket.id,
      "sessionId:",
      socket.data.sessionId
    );

    try {
      await markSessionOnline(socket.data.sessionId);
    } catch (e: any) {
      console.log("[presence] markSessionOnline failed:", e?.message || e);
    }

    bindRoomHandlers(io, socket);
    bindMessageHandlers(io, socket);
    bindDmHandlers(io, socket);
    bindInviteHandlers(io, socket);
    bindCallHandlers(io, socket);
    bindVideoGroupHandlers(io, socket);

    socket.on("disconnect", async () => {
      console.log(
        "[socket] disconnected:",
        socket.id,
        "sessionId:",
        socket.data.sessionId
      );
      try {
        await markSessionOffline(socket.data.sessionId);
      } catch (e: any) {
        console.log("[presence] markSessionOffline failed:", e?.message || e);
      }
    });
  });

  return io;
}
