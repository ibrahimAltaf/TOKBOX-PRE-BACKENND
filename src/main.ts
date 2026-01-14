import "dotenv/config";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

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

  const app = express();

  // ✅ order matters
  app.use(express.json());
  app.use(cookieParser());

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

  // Swagger (UI + JSON)
  mountSwagger(app);

  const server = http.createServer(app);

  // ✅ SOCKET INIT
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`API:     http://localhost:${env.PORT}`);
    console.log(`Swagger: http://localhost:${env.PORT}/docs`);
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
