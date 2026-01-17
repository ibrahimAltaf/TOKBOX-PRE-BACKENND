import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { env } from "../../../config/env";

const UPLOAD_ROOT =
  env.UPLOAD_ROOT || process.env.UPLOAD_ROOT || path.join("/tmp", "uploads");

function safeFolder(input: unknown) {
  const raw = String(input ?? "chat-media").trim() || "chat-media";
  return raw.replace(/^\/+|\/+$/g, "").replace(/\.\./g, "");
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export const upload = multer({
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      try {
        const folder = safeFolder((req.body as any)?.folder);
        const dest = path.join(UPLOAD_ROOT, folder);
        ensureDir(dest);
        return cb(null, dest);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        // multer callback signature requires (error, destination)
        return cb(err, UPLOAD_ROOT);
      }
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname || "");
      const name = crypto.randomBytes(16).toString("hex") + (ext || "");
      cb(null, name);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});
