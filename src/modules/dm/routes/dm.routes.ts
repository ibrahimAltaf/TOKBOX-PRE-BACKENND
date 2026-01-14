import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import {
  createThreadController,
  listDmMessagesController,
  listThreadsController,
  sendDmMessageController,
} from "../controllers/dm.controller";

export const dmRouter = Router();

// all DM endpoints require session
dmRouter.use(requireSession);

dmRouter.post("/threads", createThreadController);
dmRouter.get("/threads", listThreadsController);

dmRouter.get("/threads/:threadId/messages", listDmMessagesController);
dmRouter.post("/threads/:threadId/messages", sendDmMessageController);
