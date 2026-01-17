"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRouter = buildRouter;
const express_1 = require("express");
const sessions_routes_1 = require("./modules/sessions/routes/sessions.routes");
const rooms_routes_1 = require("./modules/rooms/routes/rooms.routes");
const media_routes_1 = require("./modules/media/routes/media.routes");
const messages_routes_1 = require("./modules/messages/routes/messages.routes");
const dm_routes_1 = require("./modules/dm/routes/dm.routes");
const invites_routes_1 = require("./modules/invites/routes/invites.routes");
const users_routes_1 = require("./modules/users/routes/users.routes");
const usersPics_routes_1 = require("./modules/usersPics/routes/usersPics.routes");
function buildRouter() {
    const r = (0, express_1.Router)();
    r.use("/sessions", sessions_routes_1.sessionsRouter);
    r.use("/rooms", rooms_routes_1.roomsRouter);
    r.use("/media", media_routes_1.mediaRouter);
    r.use("/", messages_routes_1.messagesRouter);
    r.use("/dm", dm_routes_1.dmRouter);
    r.use("/invites", invites_routes_1.invitesRouter);
    r.use("/users", users_routes_1.usersRouter);
    r.use("/users-pics", usersPics_routes_1.usersPicsRouter);
    return r;
}
