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

function resolveUploadRoot() {
  // ✅ Single source of truth + Render-safe fallback
  const root =
    env.UPLOAD_ROOT ||
    process.env.UPLOAD_ROOT ||
    path.join("/tmp", "uploads");

  fs.mkdirSync(root, { recursive: true });
  return root;
}

async function bootstrap() {
  const UPLOAD_ROOT = resolveUploadRoot();

  await connectMongo();

  await redis.ping();
  console.log("[redis] ping ok");

  const app = express();

  app.use(
    cors({
      origin: [env.CORS_ORIGIN],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  // ✅ Serve uploads from the same root multer uses
  app.use(env.PUBLIC_UPLOAD_BASE, express.static(UPLOAD_ROOT));

  app.use(buildRouter());

  app.get("/health", async (_req, res) => {
    try {
      const mongoOk = mongoose.connection.readyState === 1;
      await redis.ping();

      return res.json({
        ok: true,
        mongo: mongoOk ? "ok" : "down",
        redis: "ok",
        uploadsRoot: UPLOAD_ROOT,
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
