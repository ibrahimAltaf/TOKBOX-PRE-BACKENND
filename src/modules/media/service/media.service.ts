import path from "path";

const PUBLIC_UPLOAD_BASE = (process.env.PUBLIC_UPLOAD_BASE || "/uploads").replace(/\/$/, "");

function safeFolder(input: unknown) {
  const raw = String(input ?? "chat-media").trim() || "chat-media";
  return raw.replace(/^\/+|\/+$/g, "").replace(/\.\./g, "");
}

export async function uploadFiles(args: {
  uploaderSessionId: string;
  files: Express.Multer.File[];
  folder: string;
}) {
  const folder = safeFolder(args.folder);
  const files = args.files ?? [];

  return files.map((f: any) => {
    const filename = String(f.filename || "");
    const relKey = path.join(folder, filename).replace(/\\/g, "/");
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
