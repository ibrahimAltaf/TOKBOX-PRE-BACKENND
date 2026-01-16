import type { IncomingMessage } from "http";
import { parse as parseCookie } from "cookie"; // ✅ correct import
import { env } from "../config/env";
import { SessionModel } from "../modules/sessions/session.model";

export async function getSessionFromSocketReq(req: IncomingMessage): Promise<{
  sessionId: string;
  sessionKey: string;
} | null> {
  try {
    const raw = String(req.headers?.cookie || "").trim();
    if (!raw) return null;

    // ✅ safe cookie parsing
    const parsed = parseCookie(raw);

    const cookieName = env.SESSION_COOKIE_NAME || "bc_session";
    const sessionKey = String(parsed?.[cookieName] || "").trim();

    if (!sessionKey) return null;

    const session = await SessionModel.findOne({
      sessionKey,
      endedAt: null,
    })
      .select({ _id: 1, sessionKey: 1 })
      .lean();

    if (!session) return null;

    return {
      sessionId: String(session._id),
      sessionKey: String(session.sessionKey),
    };
  } catch {
    // ❗ socket auth must never crash
    return null;
  }
}
