"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionsByIds = getSessionsByIds;
const mongoose_1 = __importDefault(require("mongoose"));
const session_model_1 = require("../../sessions/session.model");
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
async function getSessionsByIds(sessionIds) {
    const ids = sessionIds
        .filter(isValidObjectId)
        .map((x) => new mongoose_1.default.Types.ObjectId(x));
    if (!ids.length)
        return [];
    // IMPORTANT: select fields which your frontend needs
    const sessions = await session_model_1.SessionModel.find({ _id: { $in: ids }, endedAt: null })
        .select({
        nickname: 1,
        about: 1,
        avatarUrl: 1,
        geoLabel: 1,
        lat: 1,
        lng: 1,
        photos: 1,
        lastSeenAt: 1,
        createdAt: 1,
        updatedAt: 1,
    })
        .lean();
    // keep same order as input
    const map = new Map(sessions.map((s) => [String(s._id), s]));
    return sessionIds.map((id) => map.get(id)).filter(Boolean);
}
