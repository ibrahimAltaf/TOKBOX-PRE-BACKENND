"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserPicsController = listUserPicsController;
const zod_1 = require("zod");
const usersPics_service_1 = require("../service/usersPics.service");
const Query = zod_1.z.object({
    q: zod_1.z.string().max(60).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(60),
    onlineOnly: zod_1.z.coerce.boolean().optional().default(true),
    cursor: zod_1.z.string().optional(), // ✅ add
});
async function listUserPicsController(req, res) {
    const q = Query.parse(req.query);
    const out = await (0, usersPics_service_1.listUserPics)({
        q: q.q,
        limit: q.limit,
        onlineOnly: q.onlineOnly,
        cursor: q.cursor,
    });
    return res.json({
        ok: true,
        users: out.users,
        nextCursor: out.nextCursor ?? null,
    });
}
