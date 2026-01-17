"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomMemberModel = void 0;
const mongoose_1 = require("mongoose");
const RoomMemberSchema = new mongoose_1.Schema({
    roomId: { type: mongoose_1.Types.ObjectId, ref: "Room", required: true, index: true },
    sessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ["OWNER", "MEMBER"],
        required: true,
        default: "MEMBER",
    },
    joinedAt: { type: Date, required: true, default: () => new Date() },
    leftAt: { type: Date, default: null },
    kickedAt: { type: Date, default: null },
    kickedBySessionId: { type: mongoose_1.Types.ObjectId, ref: "Session", default: null },
    bannedUntil: { type: Date, default: null },
    bannedBySessionId: { type: mongoose_1.Types.ObjectId, ref: "Session", default: null },
    // optional: track lastSeen for UI
    lastSeenAt: { type: Date, default: () => new Date(), index: true },
}, { timestamps: true });
// one active membership per room+session
RoomMemberSchema.index({ roomId: 1, sessionId: 1 }, { unique: true });
exports.RoomMemberModel = (0, mongoose_1.model)("RoomMember", RoomMemberSchema);
