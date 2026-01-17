"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSessionController = ensureSessionController;
exports.getMeController = getMeController;
exports.patchMeController = patchMeController;
exports.deleteMeController = deleteMeController;
exports.socketAuthController = socketAuthController;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../../../config/env");
const sessions_schemas_1 = require("../schemas/sessions.schemas");
const sessions_service_1 = require("../service/sessions.service");
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
async function ensureSessionController(req, res) {
    const parsed = sessions_schemas_1.EnsureSessionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }
    const cookieKey = req.cookies?.[env_1.env.SESSION_COOKIE_NAME] ?? null;
    const ip = (0, sessions_service_1.getClientIp)(req);
    const s = await (0, sessions_service_1.ensureSession)({
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
    res.cookie(env_1.env.SESSION_COOKIE_NAME, s.sessionKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: env_1.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    return res.json({ ok: true, session: (0, sessions_service_1.toSessionResponse)(s) });
}
async function getMeController(req, res) {
    const key = req.cookies?.[env_1.env.SESSION_COOKIE_NAME] ?? "";
    const sessionKey = key.trim();
    if (!sessionKey) {
        return res.status(401).json({ ok: false, error: "Missing session" });
    }
    const s = await (0, sessions_service_1.getSessionByKey)(sessionKey);
    if (!s) {
        return res.status(401).json({ ok: false, error: "Invalid/ended session" });
    }
    return res.json({ ok: true, session: (0, sessions_service_1.toSessionResponse)(s) });
}
async function patchMeController(req, res) {
    const parsed = sessions_schemas_1.UpdateMeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }
    const sessionKey = req.session.sessionKey;
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
    const s = await (0, sessions_service_1.updateMe)({
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
    return res.json({ ok: true, session: (0, sessions_service_1.toSessionResponse)(s) });
}
async function deleteMeController(req, res) {
    const sessionKey = req.session.sessionKey;
    const s = await (0, sessions_service_1.endSession)(sessionKey);
    if (!s) {
        return res.status(404).json({ ok: false, error: "Session not found" });
    }
    res.clearCookie(env_1.env.SESSION_COOKIE_NAME);
    return res.json({ ok: true });
}
async function socketAuthController(req, res) {
    const key = req.cookies?.[env_1.env.SESSION_COOKIE_NAME] ?? "";
    const sessionKey = key.trim();
    if (!sessionKey) {
        return res.status(401).json({ ok: false, error: "Missing session" });
    }
    const s = await (0, sessions_service_1.getSessionByKey)(sessionKey);
    if (!s) {
        return res.status(401).json({ ok: false, error: "Invalid/ended session" });
    }
    // ✅ IMPORTANT: return key (client will send in socket auth)
    return res.json({ ok: true, sessionKey });
}
