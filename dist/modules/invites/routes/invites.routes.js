"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitesRouter = void 0;
const express_1 = require("express");
const requireSession_1 = require("../../sessions/middleware/requireSession");
const invites_controller_1 = require("../controllers/invites.controller");
exports.invitesRouter = (0, express_1.Router)();
// Preview does NOT require session (external link use-case)
exports.invitesRouter.get("/preview/:token", invites_controller_1.previewInviteController);
// Everything else requires session
exports.invitesRouter.use(requireSession_1.requireSession);
exports.invitesRouter.post("/", invites_controller_1.createInviteController);
exports.invitesRouter.get("/incoming", invites_controller_1.listIncomingInvitesController);
exports.invitesRouter.post("/accept", invites_controller_1.acceptInviteController);
exports.invitesRouter.delete("/:token", invites_controller_1.revokeInviteController);
