"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionFromSocketReq = getSessionFromSocketReq;
const cookie_1 = require("cookie"); // ✅ correct import
const env_1 = require("../config/env");
const session_model_1 = require("../modules/sessions/session.model");
async function getSessionFromSocketReq(req) {
    try {
        const raw = String(req.headers?.cookie || "").trim();
        if (!raw)
            return null;
        // ✅ safe cookie parsing
        const parsed = (0, cookie_1.parse)(raw);
        const cookieName = env_1.env.SESSION_COOKIE_NAME || "bc_session";
        const sessionKey = String(parsed?.[cookieName] || "").trim();
        if (!sessionKey)
            return null;
        const session = await session_model_1.SessionModel.findOne({
            sessionKey,
            endedAt: null,
        })
            .select({ _id: 1, sessionKey: 1 })
            .lean();
        if (!session)
            return null;
        return {
            sessionId: String(session._id),
            sessionKey: String(session.sessionKey),
        };
    }
    catch {
        // ❗ socket auth must never crash
        return null;
    }
}
