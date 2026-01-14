import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import {
  getRoomMessagesController,
  postRoomMessageController,
} from "../controllers/messages.controller";

export const messagesRouter = Router();

// GET /rooms/:roomId/messages
messagesRouter.get("/rooms/:roomId/messages", getRoomMessagesController);

// POST /rooms/:roomId/messages (requires session)
messagesRouter.post(
  "/rooms/:roomId/messages",
  requireSession,
  postRoomMessageController
);
