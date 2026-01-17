"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitesRouter = void 0;
// src/modules/invites/routes/invites.routes.ts
const express_1 = require("express");
const requireSession_1 = require("../../sessions/middleware/requireSession");
const invites_controller_1 = require("../controllers/invites.controller");
exports.invitesRouter = (0, express_1.Router)();
exports.invitesRouter.get("/incoming", requireSession_1.requireSession, invites_controller_1.listIncomingInvitesController);
exports.invitesRouter.get("/:token", invites_controller_1.getInviteController);
exports.invitesRouter.post("/", requireSession_1.requireSession, invites_controller_1.createInviteController);
exports.invitesRouter.post("/:token/accept", requireSession_1.requireSession, invites_controller_1.acceptInviteController);
exports.invitesRouter.post("/:token/revoke", requireSession_1.requireSession, invites_controller_1.revokeInviteController);
