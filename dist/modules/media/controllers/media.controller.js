"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMediaController = uploadMediaController;
const media_service_1 = require("../service/media.service");
async function uploadMediaController(req, res) {
    const uploaderSessionId = req.session.id;
    const files = req.files ?? [];
    const folder = String(req.body?.folder ?? "chat-media").trim() || "chat-media";
    try {
        const out = await (0, media_service_1.uploadFiles)({ uploaderSessionId, files, folder });
        return res.json({
            ok: true,
            files: out,
            urls: out.map((x) => x.url),
        });
    }
    catch (e) {
        return res.status(400).json({ ok: false, error: e?.message ?? "Upload failed" });
    }
}
