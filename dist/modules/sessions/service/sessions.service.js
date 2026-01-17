"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.getClientIp = getClientIp;
exports.ensureSession = ensureSession;
exports.getSessionByKey = getSessionByKey;
exports.updateMe = updateMe;
exports.endSession = endSession;
exports.toSessionResponse = toSessionResponse;
const crypto_1 = __importDefault(require("crypto"));
const nanoid_1 = require("nanoid");
const mongoose_1 = __importDefault(require("mongoose"));
const session_model_1 = require("../session.model");
function sha256(input) {
    return crypto_1.default.createHash("sha256").update(input).digest("hex");
}
function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"]
        ?.split(",")[0]
        ?.trim();
    return xf || req.socket.remoteAddress || null;
}
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
async function ensureSession(args) {
    const key = (args.sessionKey ?? "").trim() || (0, nanoid_1.nanoid)(32);
    const ipHash = args.ip ? sha256(args.ip) : null;
    const fingerprintHash = args.fingerprint ? sha256(args.fingerprint) : null;
    const now = new Date();
    const existing = await session_model_1.SessionModel.findOne({ sessionKey: key });
    if (existing) {
        if (existing.endedAt)
            existing.endedAt = null;
        existing.lastSeenAt = now;
        if (args.nickname !== undefined)
            existing.nickname = args.nickname;
        if (args.about !== undefined)
            existing.about = args.about;
        if (args.avatarUrl !== undefined)
            existing.avatarUrl = args.avatarUrl;
        // ✅ optional
        if (args.photos !== undefined)
            existing.photos = args.photos ?? [];
        if (args.introVideoUrl !== undefined) {
            existing.introVideoUrl = args.introVideoUrl ?? null;
        }
        if (!existing.ipHash && ipHash)
            existing.ipHash = ipHash;
        if (!existing.fingerprintHash && fingerprintHash) {
            existing.fingerprintHash = fingerprintHash;
        }
        await existing.save();
        return existing;
    }
    const created = await session_model_1.SessionModel.create({
        sessionKey: key,
        nickname: args.nickname ?? null,
        about: args.about ?? null,
        avatarUrl: args.avatarUrl ?? null,
        avatarMediaId: null,
        // ✅ optional
        photos: args.photos ?? [],
        photoMediaIds: [],
        introVideoUrl: args.introVideoUrl ?? null,
        introVideoMediaId: null,
        ipHash,
        fingerprintHash,
        lastSeenAt: now,
        endedAt: null,
        isOnline: false,
    });
    return created;
}
async function getSessionByKey(sessionKey) {
    return session_model_1.SessionModel.findOne({ sessionKey, endedAt: null });
}
async function updateMe(args) {
    const s = await getSessionByKey(args.sessionKey);
    if (!s)
        return null;
    if (args.nickname !== undefined)
        s.nickname = args.nickname;
    if (args.about !== undefined)
        s.about = args.about;
    if (args.avatarUrl !== undefined)
        s.avatarUrl = args.avatarUrl;
    if (args.avatarMediaId !== undefined) {
        s.avatarMediaId =
            args.avatarMediaId && isValidObjectId(args.avatarMediaId)
                ? new mongoose_1.default.Types.ObjectId(args.avatarMediaId)
                : null;
    }
    // ✅ gallery urls
    if (args.photos !== undefined)
        s.photos = args.photos ?? [];
    // ✅ gallery ids
    if (args.photoMediaIds !== undefined) {
        s.photoMediaIds = (args.photoMediaIds ?? [])
            .filter(isValidObjectId)
            .map((id) => new mongoose_1.default.Types.ObjectId(id));
    }
    // ✅ intro video url
    if (args.introVideoUrl !== undefined) {
        s.introVideoUrl = args.introVideoUrl ?? null;
    }
    // ✅ intro video id
    if (args.introVideoMediaId !== undefined) {
        s.introVideoMediaId =
            args.introVideoMediaId && isValidObjectId(args.introVideoMediaId)
                ? new mongoose_1.default.Types.ObjectId(args.introVideoMediaId)
                : null;
    }
    s.lastSeenAt = new Date();
    await s.save();
    return s;
}
async function endSession(sessionKey) {
    const s = await session_model_1.SessionModel.findOne({ sessionKey });
    if (!s)
        return null;
    s.endedAt = new Date();
    s.isOnline = false;
    await s.save();
    return s;
}
function toSessionResponse(s) {
    return {
        id: String(s._id),
        sessionKey: s.sessionKey,
        nickname: s.nickname,
        about: s.about,
        avatarUrl: s.avatarUrl,
        avatarMediaId: s.avatarMediaId ? String(s.avatarMediaId) : null,
        // ✅ added
        photos: s.photos ?? [],
        photoMediaIds: (s.photoMediaIds ?? []).map((x) => String(x)),
        introVideoUrl: s.introVideoUrl ?? null,
        introVideoMediaId: s.introVideoMediaId ? String(s.introVideoMediaId) : null,
        lastSeenAt: s.lastSeenAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
    };
}
