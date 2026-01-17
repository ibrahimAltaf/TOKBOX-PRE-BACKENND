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
  const candidate = (env.UPLOAD_ROOT || "").trim();

  const isBad =
    !candidate ||
    candidate.startsWith("/var/www") ||
    candidate.startsWith("/root") ||
    candidate.startsWith("/etc") ||
    candidate.startsWith("/bin") ||
    candidate.startsWith("/usr") ||
    candidate.startsWith("/var/lib") ||
    candidate.startsWith("/var/data"); // unless disk mounted

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

  // ✅ Allow any origin + credentials (echo origin)
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        return cb(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ✅ IMPORTANT: remove app.options("*") / app.options("/*") — it crashes in your router setup

  app.use(express.json());
  app.use(cookieParser());

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
