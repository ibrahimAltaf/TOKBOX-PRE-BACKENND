"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOnlineUsersController = listOnlineUsersController;
const zod_1 = require("zod");
const online_store_1 = require("../../../realtime/presence/online.store");
const users_service_1 = require("../service/users.service");
const OnlineQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(60),
    cursor: zod_1.z.string().optional(),
});
async function listOnlineUsersController(req, res) {
    const q = OnlineQuery.parse(req.query);
    const { sessionIds, nextCursor } = await (0, online_store_1.listOnlineSessionIds)({
        limit: q.limit,
        cursor: q.cursor,
    });
    const users = await (0, users_service_1.getSessionsByIds)(sessionIds);
    const totalOnline = await (0, online_store_1.onlineCount)();
    return res.json({
        ok: true,
        totalOnline,
        users,
        nextCursor,
    });
}
