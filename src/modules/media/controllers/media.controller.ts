import type { Request, Response } from "express";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";
import { uploadFiles } from "../service/media.service";

export async function uploadMediaController(req: Request, res: Response) {
  const uploaderSessionId = (req as AuthedRequest).session.id;

  const files = (req.files as Express.Multer.File[]) ?? [];
  const folder = String(req.body?.folder ?? "chat-media").trim() || "chat-media";

  try {
    const out = await uploadFiles({ uploaderSessionId, files, folder });
    return res.json({
      ok: true,
      files: out,
      urls: out.map((x) => x.url),
    });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e?.message ?? "Upload failed" });
  }
}
