"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./config/env");
const mongo_1 = require("./db/mongo");
const redis_1 = require("./lib/redis");
const swagger_1 = require("./docs/swagger");
const routes_1 = require("./routes");
const socket_1 = require("./realtime/socket");
function resolveUploadRoot() {
    // ✅ Single source of truth + Render-safe fallback
    const root = env_1.env.UPLOAD_ROOT ||
        process.env.UPLOAD_ROOT ||
        path_1.default.join("/tmp", "uploads");
    fs_1.default.mkdirSync(root, { recursive: true });
    return root;
}
async function bootstrap() {
    const UPLOAD_ROOT = resolveUploadRoot();
    await (0, mongo_1.connectMongo)();
    await redis_1.redis.ping();
    console.log("[redis] ping ok");
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: [env_1.env.CORS_ORIGIN],
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }));
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    // ✅ Serve uploads from the same root multer uses
    app.use(env_1.env.PUBLIC_UPLOAD_BASE, express_1.default.static(UPLOAD_ROOT));
    app.use((0, routes_1.buildRouter)());
    app.get("/health", async (_req, res) => {
        try {
            const mongoOk = mongoose_1.default.connection.readyState === 1;
            await redis_1.redis.ping();
            return res.json({
                ok: true,
                mongo: mongoOk ? "ok" : "down",
                redis: "ok",
                uploadsRoot: UPLOAD_ROOT,
            });
        }
        catch (e) {
            return res.status(500).json({
                ok: false,
                error: e?.message ?? "unknown",
            });
        }
    });
    (0, swagger_1.mountSwagger)(app);
    const server = http_1.default.createServer(app);
    (0, socket_1.initSocket)(server);
    server.listen(env_1.env.PORT, () => {
        console.log(`API:     http://localhost:${env_1.env.PORT}`);
        console.log(`Swagger: http://localhost:${env_1.env.PORT}/docs`);
        console.log(`Uploads: http://localhost:${env_1.env.PORT}${env_1.env.PUBLIC_UPLOAD_BASE}`);
        console.log(`[uploads] root: ${UPLOAD_ROOT}`);
    });
    const shutdown = async (signal) => {
        console.log(`[shutdown] ${signal} received`);
        server.close(async () => {
            try {
                await redis_1.redis.quit();
            }
            catch { }
            try {
                await (0, mongo_1.disconnectMongo)();
            }
            catch { }
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
