"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFiles = uploadFiles;
const path_1 = __importDefault(require("path"));
const PUBLIC_UPLOAD_BASE = (process.env.PUBLIC_UPLOAD_BASE || "/uploads").replace(/\/$/, "");
function safeFolder(input) {
    const raw = String(input ?? "chat-media").trim() || "chat-media";
    return raw.replace(/^\/+|\/+$/g, "").replace(/\.\./g, "");
}
async function uploadFiles(args) {
    const folder = safeFolder(args.folder);
    const files = args.files ?? [];
    return files.map((f) => {
        const filename = String(f.filename || "");
        const relKey = path_1.default.join(folder, filename).replace(/\\/g, "/");
        const url = `${PUBLIC_UPLOAD_BASE}/${relKey}`.replace(/\/{2,}/g, "/");
        return {
            key: relKey,
            url,
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            uploaderSessionId: args.uploaderSessionId,
        };
    });
}
