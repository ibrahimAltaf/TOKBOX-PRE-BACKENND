"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DmThreadModel = void 0;
const mongoose_1 = require("mongoose");
const DmThreadSchema = new mongoose_1.Schema({
    sessionAId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
    },
    sessionBId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
    },
    lastMessageAt: { type: Date, default: null, index: true },
    // Optional (read receipts later)
    lastReadAtA: { type: Date, default: null },
    lastReadAtB: { type: Date, default: null },
}, { timestamps: true });
// Unique pair (A,B) in sorted order (enforced in service)
DmThreadSchema.index({ sessionAId: 1, sessionBId: 1 }, { unique: true });
DmThreadSchema.index({ lastMessageAt: -1 });
exports.DmThreadModel = (0, mongoose_1.model)("DmThread", DmThreadSchema);
