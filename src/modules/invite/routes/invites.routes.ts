// src/modules/invites/routes/invites.routes.ts
import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import {
  createInviteController,
  acceptInviteController,
  getInviteController,
  listIncomingInvitesController,
  revokeInviteController,
} from "../controllers/invites.controller";

export const invitesRouter = Router();

invitesRouter.get("/incoming", requireSession, listIncomingInvitesController);
invitesRouter.get("/:token", getInviteController);

invitesRouter.post("/", requireSession, createInviteController);
invitesRouter.post("/:token/accept", requireSession, acceptInviteController);
invitesRouter.post("/:token/revoke", requireSession, revokeInviteController);
