"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteModel = void 0;
// src/modules/invites/invite.model.ts
const mongoose_1 = require("mongoose");
const InviteSchema = new mongoose_1.Schema({
    token: { type: String, required: true, unique: true, index: true },
    kind: {
        type: String,
        enum: ["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"],
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"],
        required: true,
        default: "PENDING",
        index: true,
    },
    inviterSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
    },
    targetSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        default: null,
        index: true,
    },
    roomId: { type: mongoose_1.Types.ObjectId, ref: "Room", default: null, index: true },
    dmThreadId: {
        type: mongoose_1.Types.ObjectId,
        ref: "DmThread",
        default: null,
        index: true,
    },
    maxUses: { type: Number, required: true, default: 1 },
    uses: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, default: null, index: true },
    acceptedAt: { type: Date, default: null },
    acceptedBySessionId: { type: mongoose_1.Types.ObjectId, ref: "Session", default: null },
    revokedAt: { type: Date, default: null },
}, { timestamps: true });
InviteSchema.index({ targetSessionId: 1, status: 1, createdAt: -1 });
InviteSchema.index({ inviterSessionId: 1, createdAt: -1 });
InviteSchema.index({ expiresAt: 1 });
exports.InviteModel = (0, mongoose_1.model)("Invite", InviteSchema);
