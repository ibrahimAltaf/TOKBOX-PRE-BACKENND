import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import {
  banMemberController,
  joinRoomController,
  kickMemberController,
  leaveRoomController,
  listRoomMembersController,
} from "../controllers/roomMembers.controller";

export const roomMembersRouter = Router();

roomMembersRouter.use(requireSession);

// join/leave
roomMembersRouter.post("/:roomId/join", joinRoomController);
roomMembersRouter.post("/:roomId/leave", leaveRoomController);

// list members
roomMembersRouter.get("/:roomId/members", listRoomMembersController);

// moderation (owner only)
roomMembersRouter.post("/:roomId/kick", kickMemberController);
roomMembersRouter.post("/:roomId/ban", banMemberController);
