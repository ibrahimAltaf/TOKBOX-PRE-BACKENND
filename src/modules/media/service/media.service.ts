import { MediaModel } from "../media.model";
import { makeObjectKey, uploadToSpaces } from "./spaces";

function detectMediaType(mime: string) {
  if (mime.startsWith("image/")) return "IMAGE" as const;
  if (mime.startsWith("video/")) return "VIDEO" as const;
  if (mime.startsWith("audio/")) return "AUDIO" as const;
  return "OTHER" as const;
}

export async function uploadFiles(args: {
  uploaderSessionId: string;
  files: Express.Multer.File[];
  folder: string; // e.g. "avatars" | "session-videos" | "chat-media"
}) {
  if (!args.files?.length) return [];

  const results = [];

  for (const f of args.files) {
    const type = detectMediaType(f.mimetype);

    // Basic allowlist (adjust if needed)
    const allowed =
      f.mimetype.startsWith("image/") ||
      f.mimetype.startsWith("video/") ||
      f.mimetype.startsWith("audio/");

    if (!allowed) {
      throw new Error(`Unsupported file type: ${f.mimetype}`);
    }

    const key = makeObjectKey({
      folder: args.folder,
      originalName: f.originalname,
    });

    const up = await uploadToSpaces({
      buffer: f.buffer,
      mimeType: f.mimetype,
      key,
    });

    const doc = await MediaModel.create({
      uploaderSessionId: args.uploaderSessionId,
      type,
      mime: f.mimetype,
      size: f.size,
      url: up.url,
      storageKey: up.key,
      expiresAt: null, // later set via admin retention rules
      deletedAt: null,
    });

    results.push({
      id: String(doc._id),
      type: doc.type,
      mime: doc.mime,
      size: doc.size,
      url: doc.url,
      storageKey: doc.storageKey,
      createdAt: doc.createdAt,
    });
  }

  return results;
}
