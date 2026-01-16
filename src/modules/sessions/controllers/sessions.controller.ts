import type { Request, Response } from "express";
import mongoose from "mongoose";
import { env } from "../../../config/env";
import { EnsureSessionSchema, UpdateMeSchema } from "../schemas/sessions.schemas";
import {
  ensureSession,
  endSession,
  getClientIp,
  getSessionByKey,
  toSessionResponse,
  updateMe,
} from "../service/sessions.service";
import type { AuthedRequest } from "../middleware/requireSession";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

export async function ensureSessionController(req: Request, res: Response) {
  const parsed = EnsureSessionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const cookieKey =
    (req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined) ?? null;

  const ip = getClientIp(req);

  const s = await ensureSession({
    sessionKey: cookieKey,
    ip,
    fingerprint: parsed.data.fingerprint ?? null,
    nickname: parsed.data.nickname,
    about: parsed.data.about,
    avatarUrl: parsed.data.avatarUrl,

    // ✅ optional profile media
    photos: parsed.data.photos,
    introVideoUrl: parsed.data.introVideoUrl,
  });

  res.cookie(env.SESSION_COOKIE_NAME, s.sessionKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  return res.json({ ok: true, session: toSessionResponse(s) });
}

export async function getMeController(req: Request, res: Response) {
  const key =
    (req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined) ?? "";
  const sessionKey = key.trim();

  if (!sessionKey) {
    return res.status(401).json({ ok: false, error: "Missing session" });
  }

  const s = await getSessionByKey(sessionKey);
  if (!s) {
    return res.status(401).json({ ok: false, error: "Invalid/ended session" });
  }

  return res.json({ ok: true, session: toSessionResponse(s) });
}

export async function patchMeController(req: Request, res: Response) {
  const parsed = UpdateMeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const sessionKey = (req as AuthedRequest).session.sessionKey;

  // ✅ Validate avatarMediaId (optional)
  if (parsed.data.avatarMediaId && !isValidObjectId(parsed.data.avatarMediaId)) {
    return res
      .status(400)
      .json({ ok: false, error: "avatarMediaId is invalid" });
  }

  // ✅ Validate photoMediaIds (optional)
  if (parsed.data.photoMediaIds?.length) {
    const bad = parsed.data.photoMediaIds.find((id) => !isValidObjectId(id));
    if (bad) {
      return res
        .status(400)
        .json({ ok: false, error: `photoMediaIds contains invalid id: ${bad}` });
    }
  }

  // ✅ Validate introVideoMediaId (optional)
  if (parsed.data.introVideoMediaId && !isValidObjectId(parsed.data.introVideoMediaId)) {
    return res
      .status(400)
      .json({ ok: false, error: "introVideoMediaId is invalid" });
  }

  const s = await updateMe({
    sessionKey,

    nickname: parsed.data.nickname,
    about: parsed.data.about,
    avatarUrl: parsed.data.avatarUrl,
    avatarMediaId: parsed.data.avatarMediaId,

    // ✅ gallery + video
    photos: parsed.data.photos,
    photoMediaIds: parsed.data.photoMediaIds,
    introVideoUrl: parsed.data.introVideoUrl,
    introVideoMediaId: parsed.data.introVideoMediaId,
  });

  if (!s) {
    return res.status(404).json({ ok: false, error: "Session not found" });
  }

  return res.json({ ok: true, session: toSessionResponse(s) });
}

export async function deleteMeController(req: Request, res: Response) {
  const sessionKey = (req as AuthedRequest).session.sessionKey;

  const s = await endSession(sessionKey);
  if (!s) {
    return res.status(404).json({ ok: false, error: "Session not found" });
  }

  res.clearCookie(env.SESSION_COOKIE_NAME);

  return res.json({ ok: true });
}
export async function socketAuthController(req: Request, res: Response) {
  const key =
    (req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined) ?? "";
  const sessionKey = key.trim();

  if (!sessionKey) {
    return res.status(401).json({ ok: false, error: "Missing session" });
  }

  const s = await getSessionByKey(sessionKey);
  if (!s) {
    return res.status(401).json({ ok: false, error: "Invalid/ended session" });
  }

  // ✅ IMPORTANT: return key (client will send in socket auth)
  return res.json({ ok: true, sessionKey });
}