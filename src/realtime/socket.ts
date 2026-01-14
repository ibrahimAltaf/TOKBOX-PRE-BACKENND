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

import { bindRoomHandlers } from "../realtime/handlers/rooms.handlers";
import { bindMessageHandlers } from "../realtime/handlers/messages.handlers";
import { bindDmHandlers } from "../realtime/handlers/dm.handlers";
import { bindInviteHandlers } from "../realtime/handlers/invites.handlers";
import { bindCallHandlers } from "../realtime/handlers/calls.handlers";

import {
  markSessionOnline,
  markSessionOffline,
} from "../realtime/presence/online.store";

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

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const s = await getSessionFromSocketReq(socket.request);
      if (!s) return next(new Error("UNAUTHORIZED"));

      socket.data.sessionId = s.sessionId;
      socket.data.sessionKey = s.sessionKey;

      // personal room for targeted emits (dm/invites/calls)
      socket.join(`session:${s.sessionId}`);

      return next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", async (socket) => {
    // ✅ global online
    try {
      await markSessionOnline(socket.data.sessionId);
    } catch {}

    // ✅ bind all realtime handlers per socket connection
    bindRoomHandlers(io, socket);
    bindMessageHandlers(io, socket);
    bindDmHandlers(io, socket);
    bindInviteHandlers(io, socket);
    bindCallHandlers(io, socket);

    socket.on("disconnect", async () => {
      try {
        await markSessionOffline(socket.data.sessionId);
      } catch {}
    });
  });

  return io;
}
