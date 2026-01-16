import "dotenv/config";

import http from "http";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { Server } from "socket.io";

import { env } from "./config/env";
import { connectMongo, disconnectMongo } from "./db/mongo";
import { redis } from "./lib/redis";
import { mountSwagger } from "./docs/swagger";
import { buildRouter } from "./routes";

// ✅ IMPORTANT: apne project se sahi path pe import karo
// Example:
// import { getSessionByKey } from "./services/sessions";
import { getSessionByKey } from "./modules/sessions/service/sessions.service";
async function bootstrap() {
  await connectMongo();
  await redis.ping();
  console.log("[redis] ping ok");

  const UPLOAD_ROOT =
    process.env.UPLOAD_ROOT || path.join(process.cwd(), "uploads");

  const app = express();

  // ✅ CORS
  app.use(
    cors({
      origin: [env.CORS_ORIGIN], // e.g. "http://localhost:3000"
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ✅ order matters
  app.use(express.json());
  app.use(cookieParser());

  // static uploads
  app.use("/uploads", express.static(UPLOAD_ROOT));

  // routes
  app.use(buildRouter());

  // health
  app.get("/health", async (_req, res) => {
    try {
      const mongoOk = mongoose.connection.readyState === 1;
      await redis.ping();

      return res.json({
        ok: true,
        mongo: mongoOk ? "ok" : "down",
        redis: "ok",
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        error: e?.message ?? "unknown",
      });
    }
  });

  // cookie debug
  app.get("/debug/cookie", (req, res) => {
    return res.json({
      cookieHeader: req.headers.cookie || "",
      parsed: req.cookies || {},
    });
  });

  // Swagger (UI + JSON)
  mountSwagger(app);

  const server = http.createServer(app);

  // ✅ Socket.IO (single instance)
  const io = new Server(server, {
    cors: {
      origin: [env.CORS_ORIGIN], // keep consistent
      credentials: true,
    },
    transports: ["websocket"],
  });

  // ✅ Socket auth middleware
  io.use(async (socket, next) => {
    try {
      const sessionKey = String(
        (socket.handshake as any)?.auth?.sessionKey || ""
      ).trim();

      if (!sessionKey) return next(new Error("UNAUTHORIZED"));

      const s = await getSessionByKey(sessionKey);
      if (!s) return next(new Error("UNAUTHORIZED"));

      (socket.data as any).session = s;
      return next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    // ✅ example
    socket.on("disconnect", async () => {
      const s = (socket.data as any).session;
      if (s?.sessionKey) {
        // optional: mark offline
        // await SessionModel.updateOne({ sessionKey: s.sessionKey }, { $set: { isOnline: false, lastSeenAt: new Date() } });
      }
    });
  });

  server.listen(env.PORT, () => {
    console.log(`API:     http://localhost:${env.PORT}`);
    console.log(`Swagger: http://localhost:${env.PORT}/docs`);
    console.log(`Uploads: http://localhost:${env.PORT}/uploads`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[shutdown] ${signal} received`);
    server.close(async () => {
      try {
        await redis.quit();
      } catch {}
      try {
        await disconnectMongo();
      } catch {}
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
