import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env";
import { getSessionByKey } from "../service/sessions.service";

declare global {
  // attach session on req
  // eslint-disable-next-line no-var
  var __sessionReqBrand: unknown;
}

export type AuthedRequest = Request & {
  session: {
    id: string;
    sessionKey: string;
  };
};

export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key =
    (req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined) ||
    (req.headers["x-session-key"] as string | undefined) ||
    "";

  const sessionKey = key.trim();
  if (!sessionKey) {
    return res.status(401).json({ ok: false, error: "Missing session" });
  }

  const s = await getSessionByKey(sessionKey);
  if (!s) {
    return res.status(401).json({ ok: false, error: "Invalid/ended session" });
  }

  (req as AuthedRequest).session = {
    id: String(s._id),
    sessionKey: s.sessionKey,
  };
  return next();
}
