"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaModel = void 0;
const mongoose_1 = require("mongoose");
const MediaSchema = new mongoose_1.Schema({
    uploaderSessionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        enum: ["IMAGE", "VIDEO", "AUDIO", "OTHER"],
        index: true,
    },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    storageKey: { type: String, required: true, index: true },
    expiresAt: { type: Date, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });
exports.MediaModel = (0, mongoose_1.model)("Media", MediaSchema);
