import type { Request, Response } from "express";
import mongoose from "mongoose";
import { env } from "../../../config/env";
import {
  EnsureSessionSchema,
  UpdateMeSchema,
} from "../schemas/sessions.schemas";
import {
  ensureSession,
  endSession,
  getClientIp,
  getSessionByKey,
  toSessionResponse,
  updateMe,
} from "../service/sessions.service";
import type { AuthedRequest } from "../middleware/requireSession";

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
  });

  res.cookie(env.SESSION_COOKIE_NAME, s.sessionKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (can tie to env later)
  });

  return res.json({ ok: true, session: toSessionResponse(s) });
}

export async function getMeController(req: Request, res: Response) {
  const key =
    (req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined) ?? "";
  const sessionKey = key.trim();

  if (!sessionKey)
    return res.status(401).json({ ok: false, error: "Missing session" });

  const s = await getSessionByKey(sessionKey);
  if (!s)
    return res.status(401).json({ ok: false, error: "Invalid/ended session" });

  return res.json({ ok: true, session: toSessionResponse(s) });
}

export async function patchMeController(req: Request, res: Response) {
  const parsed = UpdateMeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const sessionKey = (req as AuthedRequest).session.sessionKey;

  // Validate avatarMediaId if provided (optional)
  if (
    parsed.data.avatarMediaId &&
    !mongoose.isValidObjectId(parsed.data.avatarMediaId)
  ) {
    return res
      .status(400)
      .json({ ok: false, error: "avatarMediaId is invalid" });
  }

  const s = await updateMe({
    sessionKey,
    nickname: parsed.data.nickname,
    about: parsed.data.about,
    avatarUrl: parsed.data.avatarUrl,
    avatarMediaId: parsed.data.avatarMediaId,
  });

  if (!s)
    return res.status(404).json({ ok: false, error: "Session not found" });

  return res.json({ ok: true, session: toSessionResponse(s) });
}

export async function deleteMeController(req: Request, res: Response) {
  const sessionKey = (req as AuthedRequest).session.sessionKey;

  const s = await endSession(sessionKey);
  if (!s)
    return res.status(404).json({ ok: false, error: "Session not found" });

  // Clear cookie
  res.clearCookie(env.SESSION_COOKIE_NAME);

  return res.json({ ok: true });
}
