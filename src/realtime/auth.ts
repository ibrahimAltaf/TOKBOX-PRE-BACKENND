import type { IncomingMessage } from "http";
import cookie from "cookie";
import { env } from "../config/env";
import { SessionModel } from "../modules/sessions/session.model";

export async function getSessionFromSocketReq(req: IncomingMessage) {
  const raw = req.headers.cookie || "";
  const parsed = cookie.parse(raw || "");

  const cookieName = env.SESSION_COOKIE_NAME || "bc_session";
  const sessionKey = (parsed[cookieName] || "").trim();

  if (!sessionKey) return null;

  const session = await SessionModel.findOne({
    sessionKey,
    endedAt: null,
  }).lean();
  if (!session) return null;

  return { sessionId: String(session._id), sessionKey };
}
