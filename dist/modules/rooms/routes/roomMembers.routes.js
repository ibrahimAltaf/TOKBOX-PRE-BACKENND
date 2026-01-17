"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomMembersRouter = void 0;
const express_1 = require("express");
const requireSession_1 = require("../../sessions/middleware/requireSession");
const roomMembers_controller_1 = require("../controllers/roomMembers.controller");
exports.roomMembersRouter = (0, express_1.Router)();
exports.roomMembersRouter.use(requireSession_1.requireSession);
// join/leave
exports.roomMembersRouter.post("/:roomId/join", roomMembers_controller_1.joinRoomController);
exports.roomMembersRouter.post("/:roomId/leave", roomMembers_controller_1.leaveRoomController);
// list members
exports.roomMembersRouter.get("/:roomId/members", roomMembers_controller_1.listRoomMembersController);
// moderation (owner only)
exports.roomMembersRouter.post("/:roomId/kick", roomMembers_controller_1.kickMemberController);
exports.roomMembersRouter.post("/:roomId/ban", roomMembers_controller_1.banMemberController);
