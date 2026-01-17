"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserPics = listUserPics;
const mongoose_1 = __importDefault(require("mongoose"));
const session_model_1 = require("../../sessions/session.model");
const online_store_1 = require("../../../realtime/presence/online.store");
const redis_1 = require("../../../lib/redis");
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const ONLINE_ZSET = "online:sessions:z";
async function listUserPics(args) {
    const limit = Math.max(1, Math.min(200, Number(args.limit || 60)));
    const onlineOnly = !!args.onlineOnly;
    if (onlineOnly) {
        // get ordered online IDs + cursor (score-based)
        const online = await (0, online_store_1.listOnlineSessionIds)({
            limit: Math.max(limit * 3, 60),
            cursor: args.cursor,
        });
        const onlineIds = online.sessionIds.filter(isValidObjectId);
        if (!onlineIds.length)
            return { users: [], nextCursor: null };
        const where = {
            _id: { $in: onlineIds.map((x) => new mongoose_1.default.Types.ObjectId(x)) },
            endedAt: null,
        };
        if (args.q) {
            const re = new RegExp(escapeRe(args.q), "i");
            where.$or = [{ nickname: re }, { about: re }, { geoLabel: re }];
        }
        const docs = await session_model_1.SessionModel.find(where)
            .select({
            nickname: 1,
            about: 1,
            avatarUrl: 1,
            photos: 1,
            geoLabel: 1,
            lat: 1,
            lng: 1,
            lastSeenAt: 1,
            createdAt: 1,
            updatedAt: 1,
        })
            .lean();
        // preserve online ordering
        const byId = new Map();
        for (const d of docs)
            byId.set(String(d._id), d);
        const users = onlineIds
            .map((id) => byId.get(id))
            .filter(Boolean)
            .filter((u) => (u.photos?.length || 0) > 0 || !!u.avatarUrl)
            .slice(0, limit)
            .map((u) => ({
            id: String(u._id),
            nickname: u.nickname ?? null,
            about: u.about ?? null,
            avatarUrl: u.avatarUrl ?? null,
            photos: u.photos ?? [],
            geoLabel: u.geoLabel ?? null,
            lat: u.lat ?? null,
            lng: u.lng ?? null,
            lastSeenAt: u.lastSeenAt ?? null,
            online: true,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        }));
        return { users, nextCursor: online.nextCursor };
    }
    // Not onlineOnly: fetch sessions then mark online in batch (no N+1)
    const where = { endedAt: null };
    if (args.q) {
        const re = new RegExp(escapeRe(args.q), "i");
        where.$or = [{ nickname: re }, { about: re }, { geoLabel: re }];
    }
    const docs = await session_model_1.SessionModel.find(where)
        .select({
        nickname: 1,
        about: 1,
        avatarUrl: 1,
        photos: 1,
        geoLabel: 1,
        lat: 1,
        lng: 1,
        lastSeenAt: 1,
        createdAt: 1,
        updatedAt: 1,
    })
        .sort({ lastSeenAt: -1, updatedAt: -1 })
        .limit(limit)
        .lean();
    const ids = docs.map((u) => String(u._id));
    // batch online check: ZSCORE in pipeline
    const pipe = redis_1.redis.pipeline();
    for (const id of ids)
        pipe.zscore(ONLINE_ZSET, id);
    const results = (await pipe.exec()) ?? []; // ✅ exec can be null
    const onlineMap = new Map();
    results.forEach((r, i) => {
        const val = r?.[1];
        onlineMap.set(ids[i], val !== null && val !== undefined);
    });
    const users = docs.map((u) => {
        const id = String(u._id);
        return {
            id,
            nickname: u.nickname ?? null,
            about: u.about ?? null,
            avatarUrl: u.avatarUrl ?? null,
            photos: u.photos ?? [],
            geoLabel: u.geoLabel ?? null,
            lat: u.lat ?? null,
            lng: u.lng ?? null,
            lastSeenAt: u.lastSeenAt ?? null,
            online: onlineMap.get(id) ?? false,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        };
    });
    return { users, nextCursor: null };
}
