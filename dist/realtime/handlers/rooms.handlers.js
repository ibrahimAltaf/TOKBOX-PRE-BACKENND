"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindRoomHandlers = bindRoomHandlers;
const presence_store_1 = require("../presence/presence.store");
const roomMembers_service_1 = require("../../modules/rooms/service/roomMembers.service");
const rooms_service_1 = require("../../modules/rooms/service/rooms.service");
const roomNamespace = (roomId) => `room:${roomId}`;
const sessionNamespace = (sessionId) => `session:${sessionId}`;
async function emitPresence(io, roomId) {
    const sessionIds = await (0, presence_store_1.listRoomPresence)(roomId);
    io.to(roomNamespace(roomId)).emit("presence:update", {
        roomId,
        sessionIds,
    });
}
function bindRoomHandlers(io, socket) {
    socket.on("room:join", async ({ roomId }, cb) => {
        try {
            const meSessionId = socket.data.sessionId;
            // ✅ DB rules: ban/maxUsers/owner
            const out = await (0, roomMembers_service_1.joinRoom)({ roomId, sessionId: meSessionId });
            if (!out.ok)
                return cb?.({ ok: false, error: out.error });
            socket.join(roomNamespace(roomId));
            await (0, presence_store_1.addToRoomPresence)(roomId, meSessionId);
            await emitPresence(io, roomId);
            cb?.({ ok: true, role: out.role });
        }
        catch {
            cb?.({ ok: false, error: "JOIN_FAILED" });
        }
    });
    socket.on("room:leave", async ({ roomId }, cb) => {
        try {
            const meSessionId = socket.data.sessionId;
            await (0, roomMembers_service_1.leaveRoom)({ roomId, sessionId: meSessionId });
            socket.leave(roomNamespace(roomId));
            await (0, presence_store_1.removeFromRoomPresence)(roomId, meSessionId);
            // ✅ Owner leaves => close room
            const closeOut = await (0, rooms_service_1.closeRoomIfOwnerLeft)({
                roomId,
                leavingSessionId: meSessionId,
            });
            if (closeOut.ok && closeOut.closed) {
                // notify + clear remaining presence
                const sessionIds = await (0, presence_store_1.listRoomPresence)(roomId);
                for (const sid of sessionIds) {
                    await (0, presence_store_1.removeFromRoomPresence)(roomId, sid);
                    io.to(sessionNamespace(sid)).emit("room:closed", {
                        roomId,
                        bySessionId: meSessionId,
                    });
                }
                io.to(roomNamespace(roomId)).emit("room:closed", {
                    roomId,
                    bySessionId: meSessionId,
                });
            }
            await emitPresence(io, roomId);
            cb?.({ ok: true, closed: closeOut.ok ? closeOut.closed : false });
        }
        catch {
            cb?.({ ok: false, error: "LEAVE_FAILED" });
        }
    });
    socket.on("disconnect", async () => {
        const meSessionId = socket.data.sessionId;
        // rooms where user was present
        const rooms = await (0, presence_store_1.cleanupSessionPresence)(meSessionId);
        for (const roomId of rooms) {
            try {
                await (0, roomMembers_service_1.leaveRoom)({ roomId, sessionId: meSessionId });
                const closeOut = await (0, rooms_service_1.closeRoomIfOwnerLeft)({
                    roomId,
                    leavingSessionId: meSessionId,
                });
                if (closeOut.ok && closeOut.closed) {
                    const sessionIds = await (0, presence_store_1.listRoomPresence)(roomId);
                    for (const sid of sessionIds) {
                        await (0, presence_store_1.removeFromRoomPresence)(roomId, sid);
                        io.to(sessionNamespace(sid)).emit("room:closed", {
                            roomId,
                            bySessionId: meSessionId,
                        });
                    }
                    io.to(roomNamespace(roomId)).emit("room:closed", {
                        roomId,
                        bySessionId: meSessionId,
                    });
                }
                await emitPresence(io, roomId);
            }
            catch {
                // ignore disconnect cleanup errors
            }
        }
    });
}
