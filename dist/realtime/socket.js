"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("../lib/redis");
const env_1 = require("../config/env");
const auth_1 = require("./auth");
const session_model_1 = require("../modules/sessions/session.model");
const rooms_handlers_1 = require("../realtime/handlers/rooms.handlers");
const messages_handlers_1 = require("../realtime/handlers/messages.handlers");
const dm_handlers_1 = require("../realtime/handlers/dm.handlers");
const invites_handlers_1 = require("../realtime/handlers/invites.handlers");
const calls_handlers_1 = require("../realtime/handlers/calls.handlers");
const videoGroup_handlers_1 = require("../realtime/handlers/videoGroup.handlers");
const online_store_1 = require("../realtime/presence/online.store");
async function getSessionFromHandshakeAuth(socket) {
    const key = String(socket.handshake?.auth?.sessionKey || "").trim();
    if (!key)
        return null;
    const session = await session_model_1.SessionModel.findOne({
        sessionKey: key,
        endedAt: null,
    })
        .select({ _id: 1, sessionKey: 1 })
        .lean();
    if (!session)
        return null;
    return { sessionId: String(session._id), sessionKey: key };
}
function initSocket(server) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.env.CORS_ORIGIN,
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });
    // Redis adapter (for scaling across multiple Node instances)
    const pub = redis_1.redis;
    const sub = redis_1.redis.duplicate();
    io.adapter((0, redis_adapter_1.createAdapter)(pub, sub));
    io.use(async (socket, next) => {
        try {
            const origin = socket.request?.headers?.origin;
            const cookieHeader = socket.request?.headers?.cookie || "";
            const handshakeKey = String(socket.handshake?.auth?.sessionKey || "").trim();
            console.log("[socket-auth] origin:", origin);
            console.log("[socket-auth] cookieHeader:", cookieHeader ? "(present)" : "(none)");
            console.log("[socket-auth] handshakeKey:", handshakeKey ? `${handshakeKey.slice(0, 6)}...` : "(none)");
            // 1) cookie-based
            let s = await (0, auth_1.getSessionFromSocketReq)(socket.request);
            if (s) {
                console.log("[socket-auth] cookie-based OK:", s.sessionId);
            }
            else {
                console.log("[socket-auth] cookie-based MISS");
            }
            // 2) handshake auth fallback
            if (!s) {
                s = await getSessionFromHandshakeAuth(socket);
                if (s)
                    console.log("[socket-auth] handshake-based OK:", s.sessionId);
                else
                    console.log("[socket-auth] handshake-based MISS");
            }
            if (!s) {
                console.log("[socket-auth] UNAUTHORIZED (no session)");
                return next(new Error("UNAUTHORIZED"));
            }
            socket.data.sessionId = s.sessionId;
            socket.data.sessionKey = s.sessionKey;
            socket.join(`session:${s.sessionId}`);
            return next();
        }
        catch (e) {
            console.log("[socket-auth] ERROR:", e?.message || e);
            return next(new Error("UNAUTHORIZED"));
        }
    });
    io.on("connection", async (socket) => {
        console.log("[socket] connected:", socket.id, "sessionId:", socket.data.sessionId);
        try {
            await (0, online_store_1.markSessionOnline)(socket.data.sessionId);
        }
        catch (e) {
            console.log("[presence] markSessionOnline failed:", e?.message || e);
        }
        (0, rooms_handlers_1.bindRoomHandlers)(io, socket);
        (0, messages_handlers_1.bindMessageHandlers)(io, socket);
        (0, dm_handlers_1.bindDmHandlers)(io, socket);
        (0, invites_handlers_1.bindInviteHandlers)(io, socket);
        (0, calls_handlers_1.bindCallHandlers)(io, socket);
        (0, videoGroup_handlers_1.bindVideoGroupHandlers)(io, socket);
        socket.on("disconnect", async () => {
            console.log("[socket] disconnected:", socket.id, "sessionId:", socket.data.sessionId);
            try {
                await (0, online_store_1.markSessionOffline)(socket.data.sessionId);
            }
            catch (e) {
                console.log("[presence] markSessionOffline failed:", e?.message || e);
            }
        });
    });
    return io;
}
