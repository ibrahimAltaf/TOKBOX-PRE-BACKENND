"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSession = requireSession;
const env_1 = require("../../../config/env");
const sessions_service_1 = require("../service/sessions.service");
async function requireSession(req, res, next) {
    const key = req.cookies?.[env_1.env.SESSION_COOKIE_NAME] ||
        req.headers["x-session-key"] ||
        "";
    const sessionKey = key.trim();
    if (!sessionKey) {
        return res.status(401).json({ ok: false, error: "Missing session" });
    }
    const s = await (0, sessions_service_1.getSessionByKey)(sessionKey);
    if (!s) {
        return res.status(401).json({ ok: false, error: "Invalid/ended session" });
    }
    req.session = {
        id: String(s._id),
        sessionKey: s.sessionKey,
    };
    return next();
}
