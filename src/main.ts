import "dotenv/config";

import http from "http";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { env } from "./config/env";
import { connectMongo, disconnectMongo } from "./db/mongo";
import { redis } from "./lib/redis";
import { mountSwagger } from "./docs/swagger";
import { buildRouter } from "./routes";

import { initSocket } from "./realtime/socket";

async function bootstrap() {
  await connectMongo();
  await redis.ping();
  console.log("[redis] ping ok");

  const UPLOAD_ROOT =
    process.env.UPLOAD_ROOT || path.join(process.cwd(), "uploads");

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

  app.use("/uploads", express.static(UPLOAD_ROOT));

  // routes
  app.use(buildRouter());

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

  app.get("/debug/cookie", (req, res) => {
    return res.json({
      cookieHeader: req.headers.cookie || "",
      parsed: req.cookies || {},
    });
  });

  mountSwagger(app);

  const server = http.createServer(app);

  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`API:     http://localhost:${env.PORT}`);
    console.log(`Swagger: http://localhost:${env.PORT}/docs`);
    console.log(`Uploads: http://localhost:${env.PORT}/uploads`);
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
