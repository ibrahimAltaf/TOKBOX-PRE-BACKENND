import "dotenv/config";

import http from "http";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";

import { env } from "./config/env";
import { connectMongo, disconnectMongo } from "./db/mongo";
import { redis } from "./lib/redis";
import { mountSwagger } from "./docs/swagger";
import { buildRouter } from "./routes";
import { initSocket } from "./realtime/socket";
import { onlineCount } from "./realtime/presence/online.store";

function resolveUploadRoot() {
  const candidate = (env.UPLOAD_ROOT || process.env.UPLOAD_ROOT || "").trim();

  // ❌ system paths are not writable on Render
  const isBad =
    !candidate ||
    candidate.startsWith("/var/www") ||
    candidate.startsWith("/var/data") ||
    candidate.startsWith("/root") ||
    candidate.startsWith("/etc") ||
    candidate.startsWith("/bin") ||
    candidate.startsWith("/usr");

  // ✅ Render-safe fallback
  const root = isBad ? path.join("/tmp", "uploads") : candidate;

  fs.mkdirSync(root, { recursive: true });
  return root;
}

async function bootstrap() {
  const UPLOAD_ROOT = resolveUploadRoot();

  await connectMongo();
  await redis.ping();
  console.log("[redis] ping ok");

  const app = express();

  // ✅ allow all origins (credentials-safe)
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // non-browser / server-to-server
        return cb(null, true); // allow any origin
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  /**
   * ✅ IMPORTANT:
   * Express/router newer path-to-regexp versions can throw on "*" or "/*"
   * So use regex instead of app.options("*", ...)
   */
  app.options(/.*/, cors({ origin: true, credentials: true }));

  app.use(express.json());
  app.use(cookieParser());

  // ✅ serve uploads (same folder multer uses)
  app.use(env.PUBLIC_UPLOAD_BASE, express.static(UPLOAD_ROOT));

  // routes
  app.use(buildRouter());

  app.get("/health", async (_req, res) => {
    try {
      const mongoOk = mongoose.connection.readyState === 1;
      await redis.ping();
      const oc = await onlineCount();

      return res.json({
        ok: true,
        mongo: mongoOk ? "ok" : "down",
        redis: "ok",
        uploadsRoot: UPLOAD_ROOT,
        onlineCount: oc,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        error: e?.message ?? "unknown",
      });
    }
  });

  mountSwagger(app);

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`API:     http://localhost:${env.PORT}`);
    console.log(`Swagger: http://localhost:${env.PORT}/docs`);
    console.log(`Uploads: http://localhost:${env.PORT}${env.PUBLIC_UPLOAD_BASE}`);
    console.log(`[uploads] root: ${UPLOAD_ROOT}`);
  });

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
