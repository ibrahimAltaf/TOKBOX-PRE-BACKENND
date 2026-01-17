"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomsRouter = void 0;
const express_1 = require("express");
const requireSession_1 = require("../../sessions/middleware/requireSession");
const rooms_controller_1 = require("../controllers/rooms.controller");
const roomMembers_routes_1 = require("./roomMembers.routes");
exports.roomsRouter = (0, express_1.Router)();
// Public: list + detail
exports.roomsRouter.get("/", rooms_controller_1.listRoomsController);
exports.roomsRouter.get("/:id", rooms_controller_1.getRoomController);
// Create (recommended to require session)
exports.roomsRouter.post("/", requireSession_1.requireSession, rooms_controller_1.createRoomController);
// Update/Close (for now require session; later owner/admin enforcement)
exports.roomsRouter.patch("/:id", requireSession_1.requireSession, rooms_controller_1.patchRoomController);
exports.roomsRouter.delete("/:id", requireSession_1.requireSession, rooms_controller_1.deleteRoomController);
exports.roomsRouter.use("/", roomMembers_routes_1.roomMembersRouter);
