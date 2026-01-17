"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRoomMessagesController = listRoomMessagesController;
exports.sendRoomMessageController = sendRoomMessageController;
const zod_1 = require("zod");
const messages_service_1 = require("../service/messages.service");
const ListQuery = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
    cursor: zod_1.z.string().optional(),
});
const SendBody = zod_1.z.object({
    text: zod_1.z.string().optional(),
    mediaUrls: zod_1.z.array(zod_1.z.string()).optional(),
    mediaIds: zod_1.z.array(zod_1.z.string()).optional(),
});
async function listRoomMessagesController(req, res) {
    const roomId = String(req.params.roomId || "");
    const q = ListQuery.parse(req.query);
    const out = await (0, messages_service_1.listRoomMessages)({
        roomId,
        limit: q.limit,
        cursor: q.cursor,
    });
    if (!out.ok)
        return res.status(400).json(out);
    // NOTE: your service returns newest-first; many UIs prefer oldest-first
    // If your frontend expects newest-first, remove `.reverse()`.
    const items = out.messages.map(messages_service_1.toMessageResponse).reverse();
    return res.json({
        ok: true,
        messages: items,
        nextCursor: out.nextCursor,
    });
}
async function sendRoomMessageController(req, res) {
    const roomId = String(req.params.roomId || "");
    const meSessionId = req.session.id;
    const body = SendBody.parse(req.body);
    const out = await (0, messages_service_1.sendRoomMessage)({
        roomId,
        senderSessionId: meSessionId,
        text: body.text,
        mediaUrls: body.mediaUrls,
        mediaIds: body.mediaIds,
    });
    if (!out.ok)
        return res.status(400).json(out);
    return res.json({ ok: true, message: (0, messages_service_1.toMessageResponse)(out.message) });
}
