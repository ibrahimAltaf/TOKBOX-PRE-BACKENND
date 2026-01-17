"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteModel = void 0;
const mongoose_1 = require("mongoose");
const InviteSchema = new mongoose_1.Schema({
    // human friendly token (used in URLs)
    token: { type: String, required: true, unique: true, index: true },
    kind: {
        type: String,
        required: true,
        enum: ["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"],
        index: true,
    },
    // who created invite
    inviterSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
    },
    // optional: internal invite target (in-app invite)
    targetSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        default: null,
        index: true,
    },
    // payload (what is being invited to)
    roomId: { type: mongoose_1.Types.ObjectId, ref: "Room", default: null, index: true },
    dmThreadId: {
        type: mongoose_1.Types.ObjectId,
        ref: "DmThread",
        default: null,
        index: true,
    },
    // state
    status: {
        type: String,
        required: true,
        enum: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"],
        index: true,
        default: "PENDING",
    },
    // limits
    maxUses: { type: Number, default: 1 },
    uses: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null, index: true },
    acceptedAt: { type: Date, default: null },
    acceptedBySessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        default: null,
    },
    revokedAt: { type: Date, default: null },
}, { timestamps: true });
InviteSchema.index({ targetSessionId: 1, status: 1, createdAt: -1 });
exports.InviteModel = (0, mongoose_1.model)("Invite", InviteSchema);
