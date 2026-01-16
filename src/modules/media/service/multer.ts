import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), "uploads");

function safeFolder(input: unknown) {
  const raw = String(input ?? "chat-media").trim() || "chat-media";
  // sanitize: no absolute, no ../
  return raw.replace(/^\/+|\/+$/g, "").replace(/\.\./g, "");
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export const upload = multer({
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      const folder = safeFolder((req.body as any)?.folder);
      const dest = path.join(UPLOAD_ROOT, folder);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname || "");
      const name = crypto.randomBytes(16).toString("hex") + (ext || "");
      cb(null, name);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});
