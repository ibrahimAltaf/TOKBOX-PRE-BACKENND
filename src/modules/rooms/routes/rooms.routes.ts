import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import {
  createRoomController,
  deleteRoomController,
  getRoomController,
  listRoomsController,
  patchRoomController,
} from "../controllers/rooms.controller";
import { roomMembersRouter } from "./roomMembers.routes";

export const roomsRouter = Router();

// Public: list + detail
roomsRouter.get("/", listRoomsController);
roomsRouter.get("/:id", getRoomController);

// Create (recommended to require session)
roomsRouter.post("/", requireSession, createRoomController);

// Update/Close (for now require session; later owner/admin enforcement)
roomsRouter.patch("/:id", requireSession, patchRoomController);
roomsRouter.delete("/:id", requireSession, deleteRoomController);
roomsRouter.use("/", roomMembersRouter);
