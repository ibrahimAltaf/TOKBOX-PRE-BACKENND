"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DmMessageModel = void 0;
const mongoose_1 = require("mongoose");
const DmMessageSchema = new mongoose_1.Schema({
    threadId: {
        type: mongoose_1.Types.ObjectId,
        ref: "DmThread",
        required: true,
        index: true,
    },
    senderSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
    },
    text: { type: String, default: null },
    mediaUrls: { type: [String], default: [] },
    mediaIds: { type: [mongoose_1.Types.ObjectId], ref: "Media", default: [] },
    deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });
DmMessageSchema.index({ threadId: 1, createdAt: -1 });
exports.DmMessageModel = (0, mongoose_1.model)("DmMessage", DmMessageSchema);
