"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThreadController = createThreadController;
exports.listThreadsController = listThreadsController;
exports.listDmMessagesController = listDmMessagesController;
exports.sendDmMessageController = sendDmMessageController;
const dm_schemas_1 = require("../schemas/dm.schemas");
const dm_service_1 = require("../service/dm.service");
async function createThreadController(req, res) {
    const parsed = dm_schemas_1.CreateThreadSchema.safeParse(req.body ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, dm_service_1.openThread)({
        meSessionId,
        targetSessionId: parsed.data.targetSessionId,
    });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    return res.json({
        ok: true,
        thread: (0, dm_service_1.toThreadResponse)(out.thread, meSessionId),
    });
}
async function listThreadsController(req, res) {
    const parsed = dm_schemas_1.ListThreadsSchema.safeParse(req.query ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, dm_service_1.listThreads)({
        meSessionId,
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
    });
    return res.json({
        ok: true,
        threads: out.threads.map((t) => (0, dm_service_1.toThreadResponse)(t, meSessionId)),
        nextCursor: out.nextCursor,
    });
}
async function listDmMessagesController(req, res) {
    const threadId = String(req.params.threadId || "").trim();
    const parsed = dm_schemas_1.ListDmMessagesSchema.safeParse(req.query ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, dm_service_1.listThreadMessages)({
        meSessionId,
        threadId,
        limit: parsed.data.limit,
        cursor: parsed.data.cursor,
    });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    return res.json({
        ok: true,
        messages: out.messages.map(dm_service_1.toDmMessageResponse),
        nextCursor: out.nextCursor,
    });
}
async function sendDmMessageController(req, res) {
    const threadId = String(req.params.threadId || "").trim();
    const parsed = dm_schemas_1.SendDmMessageSchema.safeParse(req.body ?? {});
    if (!parsed.success)
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    const meSessionId = req.session.id;
    const out = await (0, dm_service_1.sendDmMessage)({
        meSessionId,
        threadId,
        text: parsed.data.text,
        mediaUrls: parsed.data.mediaUrls,
        mediaIds: parsed.data.mediaIds,
    });
    if (!out.ok)
        return res.status(400).json({ ok: false, error: out.error });
    return res.json({
        ok: true,
        message: (0, dm_service_1.toDmMessageResponse)(out.message),
        thread: (0, dm_service_1.toThreadResponse)(out.thread, meSessionId),
    });
}
