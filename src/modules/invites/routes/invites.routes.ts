import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import {
  acceptInviteController,
  createInviteController,
  listIncomingInvitesController,
  previewInviteController,
  revokeInviteController,
} from "../controllers/invites.controller";

export const invitesRouter = Router();

// Preview does NOT require session (external link use-case)
invitesRouter.get("/preview/:token", previewInviteController);

// Everything else requires session
invitesRouter.use(requireSession);

invitesRouter.post("/", createInviteController);
invitesRouter.get("/incoming", listIncomingInvitesController);
invitesRouter.post("/accept", acceptInviteController);
invitesRouter.delete("/:token", revokeInviteController);
