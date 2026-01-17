"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionModel = void 0;
const mongoose_1 = require("mongoose");
const SessionSchema = new mongoose_1.Schema({
    sessionKey: { type: String, required: true, unique: true, index: true },
    nickname: { type: String, default: null },
    about: { type: String, default: null },
    // Avatar
    avatarUrl: { type: String, default: null },
    avatarMediaId: { type: mongoose_1.Types.ObjectId, ref: "Media", default: null },
    // ✅ Gallery (URLs + optional Media ids)
    photos: { type: [String], default: [] },
    photoMediaIds: { type: [mongoose_1.Types.ObjectId], ref: "Media", default: [] },
    // ✅ Intro video
    introVideoUrl: { type: String, default: null },
    introVideoMediaId: { type: mongoose_1.Types.ObjectId, ref: "Media", default: null },
    fingerprintHash: { type: String, default: null, index: true },
    ipHash: { type: String, default: null, index: true },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date, default: null, index: true },
    isOnline: { type: Boolean, default: false, index: true },
}, { timestamps: true });
SessionSchema.index({ lastSeenAt: -1 });
exports.SessionModel = (0, mongoose_1.model)("Session", SessionSchema);
