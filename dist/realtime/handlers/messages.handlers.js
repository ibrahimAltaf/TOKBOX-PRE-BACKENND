"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindMessageHandlers = bindMessageHandlers;
const messages_service_1 = require("../../modules/messages/service/messages.service");
const roomNamespace = (roomId) => `room:${roomId}`;
function bindMessageHandlers(io, socket) {
    socket.on("msg:send", async (payload, cb) => {
        try {
            const { roomId, text, mediaUrls, mediaIds } = payload;
            const out = await (0, messages_service_1.sendRoomMessage)({
                roomId,
                senderSessionId: socket.data.sessionId,
                text,
                mediaUrls,
                mediaIds,
            });
            if (!out.ok) {
                cb?.({ ok: false, error: out.error });
                return;
            }
            const message = (0, messages_service_1.toMessageResponse)(out.message);
            // ✅ Keep your existing emit shape (roomId + message)
            io.to(roomNamespace(roomId)).emit("msg:new", { roomId, message });
            cb?.({ ok: true, message });
        }
        catch (e) {
            cb?.({ ok: false, error: e?.message ?? "SEND_FAILED" });
        }
    });
    socket.on("typing:start", async ({ roomId }, cb) => {
        try {
            io.to(roomNamespace(roomId)).emit("typing:update", {
                roomId,
                sessionId: socket.data.sessionId,
                isTyping: true,
            });
            cb?.({ ok: true });
        }
        catch (e) {
            cb?.({ ok: false, error: e?.message ?? "TYPING_START_FAILED" });
        }
    });
    socket.on("typing:stop", async ({ roomId }, cb) => {
        try {
            io.to(roomNamespace(roomId)).emit("typing:update", {
                roomId,
                sessionId: socket.data.sessionId,
                isTyping: false,
            });
            cb?.({ ok: true });
        }
        catch (e) {
            cb?.({ ok: false, error: e?.message ?? "TYPING_STOP_FAILED" });
        }
    });
}
