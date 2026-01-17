"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomModel = void 0;
const mongoose_1 = require("mongoose");
const RoomSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        enum: ["PUBLIC", "PRIVATE", "VIDEO_GROUP", "VIDEO_1ON1"],
        index: true,
    },
    // Public discover fields
    slug: { type: String, default: null, index: true },
    title: { type: String, default: null },
    // Ownership (for close/kick/limits)
    ownerSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        default: null,
        index: true,
    },
    // State
    isOpen: { type: Boolean, default: true, index: true },
    endedAt: { type: Date, default: null, index: true },
    // Optional override (admin config can override globally later)
    maxUsers: { type: Number, default: null },
}, { timestamps: true });
RoomSchema.index({ type: 1, isOpen: 1, createdAt: -1 });
RoomSchema.index({ slug: 1 }, { unique: false });
exports.RoomModel = (0, mongoose_1.model)("Room", RoomSchema);
