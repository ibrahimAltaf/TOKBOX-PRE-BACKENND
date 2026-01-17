"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindDmHandlers = bindDmHandlers;
const dm_service_1 = require("../../modules/dm/service/dm.service");
function getThreadId(t) {
    return String(t?._id ?? t?.id ?? "");
}
/**
 * Extract the OTHER participant sessionId from thread.
 * Adjust these field names if your thread schema differs.
 */
function getOtherParticipantSessionId(thread, meSessionId) {
    const me = String(meSessionId);
    // common shapes (try all)
    const candidates = [
        thread?.aSessionId,
        thread?.bSessionId,
        thread?.memberA,
        thread?.memberB,
        thread?.sessionA,
        thread?.sessionB,
        thread?.userA,
        thread?.userB,
    ].map((x) => (x != null ? String(x) : ""));
    // If you store participants array
    if (Array.isArray(thread?.memberIds)) {
        for (const id of thread.memberIds) {
            const sid = String(id);
            if (sid && sid !== me)
                return sid;
        }
    }
    if (Array.isArray(thread?.participants)) {
        for (const p of thread.participants) {
            const sid = String(p?.sessionId ?? p?._id ?? p?.id ?? p);
            if (sid && sid !== me)
                return sid;
        }
    }
    // Pair fields fallback: return the one that is not me
    const unique = Array.from(new Set(candidates.filter(Boolean)));
    for (const sid of unique) {
        if (sid && sid !== me)
            return sid;
    }
    return null;
}
function bindDmHandlers(io, socket) {
    socket.on("dm:open", async ({ targetSessionId }, cb) => {
        const out = await (0, dm_service_1.openThread)({
            meSessionId: socket.data.sessionId,
            targetSessionId,
        });
        if (!out.ok)
            return cb?.({ ok: false, error: out.error });
        const threadId = getThreadId(out.thread);
        if (threadId)
            socket.join(`dm:${threadId}`);
        cb?.({
            ok: true,
            thread: (0, dm_service_1.toThreadResponse)(out.thread, socket.data.sessionId),
        });
    });
    socket.on("dm:send", async ({ threadId, text, mediaUrls, mediaIds }, cb) => {
        const out = await (0, dm_service_1.sendDmMessage)({
            meSessionId: socket.data.sessionId,
            threadId,
            text,
            mediaUrls,
            mediaIds,
        });
        if (!out.ok)
            return cb?.({ ok: false, error: out.error });
        const message = (0, dm_service_1.toDmMessageResponse)(out.message);
        // ✅ 1) Emit to thread room (users who have DM open)
        io.to(`dm:${threadId}`).emit("dm:new", { threadId, message });
        // ✅ 2) Always emit to sender session room
        io.to(`session:${socket.data.sessionId}`).emit("dm:new", { threadId, message });
        // ✅ 3) Always emit to receiver session room (THIS FIXES YOUR ISSUE)
        // Prefer using out.thread if service returns it; otherwise, try out.message.thread
        const thread = out.thread ??
            out.message?.thread ??
            out.message?.threadId ??
            null;
        // If thread object returned by service:
        let otherSessionId = null;
        if (thread && typeof thread === "object") {
            otherSessionId = getOtherParticipantSessionId(thread, socket.data.sessionId);
        }
        else {
            // If service doesn't return thread object, you MUST modify service to include it
            // or fetch it here from DB using threadId.
            otherSessionId = null;
        }
        if (otherSessionId) {
            io.to(`session:${otherSessionId}`).emit("dm:new", { threadId, message });
        }
        cb?.({ ok: true, message });
    });
}
