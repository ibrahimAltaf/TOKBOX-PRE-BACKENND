// src/modules/messages/routes/messages.routes.ts
import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import {
  listRoomMessagesController,
  sendRoomMessageController,
} from "../controllers/messages.controller";

export const messagesRouter = Router();

// Rooms messages
messagesRouter.get("/rooms/:roomId/messages", listRoomMessagesController);
messagesRouter.post(
  "/rooms/:roomId/messages",
  requireSession,
  sendRoomMessageController
);
