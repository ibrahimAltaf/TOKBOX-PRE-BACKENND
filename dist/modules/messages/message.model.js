"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageModel = void 0;
const mongoose_1 = require("mongoose");
const MessageSchema = new mongoose_1.Schema({
    roomId: { type: mongoose_1.Types.ObjectId, ref: "Room", required: true, index: true },
    senderSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        default: null,
        index: true,
    },
    type: {
        type: String,
        required: true,
        enum: ["TEXT", "SYSTEM"],
        index: true,
    },
    text: { type: String, default: null },
    // For now store URLs; later we can also store mediaIds
    mediaUrls: { type: [String], default: [] },
    mediaIds: { type: [mongoose_1.Types.ObjectId], ref: "Media", default: [] },
    deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });
MessageSchema.index({ roomId: 1, createdAt: -1 });
exports.MessageModel = (0, mongoose_1.model)("Message", MessageSchema);
