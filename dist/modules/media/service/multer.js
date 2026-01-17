"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../../../config/env");
/**
 * Render-safe upload root
 * Priority:
 * 1) env.UPLOAD_ROOT (Render env)
 * 2) /tmp/uploads (always writable on Render)
 */
const UPLOAD_ROOT = env_1.env.UPLOAD_ROOT && env_1.env.UPLOAD_ROOT.trim()
    ? env_1.env.UPLOAD_ROOT
    : path_1.default.join("/tmp", "uploads");
/**
 * Prevent directory traversal & absolute paths
 */
function safeFolder(input) {
    const raw = String(input ?? "chat-media").trim() || "chat-media";
    return raw.replace(/^\/+|\/+$/g, "").replace(/\.\./g, "");
}
/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
    fs_1.default.mkdirSync(dirPath, { recursive: true });
}
/**
 * Multer instance
 */
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination(req, _file, cb) {
            try {
                const folder = safeFolder(req.body?.folder);
                const dest = path_1.default.join(UPLOAD_ROOT, folder);
                ensureDir(dest);
                return cb(null, dest);
            }
            catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                // multer requires (error, destination)
                return cb(err, UPLOAD_ROOT);
            }
        },
        filename(_req, file, cb) {
            const ext = path_1.default.extname(file.originalname || "");
            const name = crypto_1.default.randomBytes(16).toString("hex") + ext;
            cb(null, name);
        },
    }),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 10,
    },
});
