"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsRouter = void 0;
const express_1 = require("express");
const sessions_controller_1 = require("../controllers/sessions.controller");
const requireSession_1 = require("../middleware/requireSession");
exports.sessionsRouter = (0, express_1.Router)();
// Create/refresh anonymous session + set cookie
exports.sessionsRouter.post("/ensure", sessions_controller_1.ensureSessionController);
// Read current session (cookie-based)
exports.sessionsRouter.get("/me", sessions_controller_1.getMeController);
// Update current session (requires valid session)
exports.sessionsRouter.patch("/me", requireSession_1.requireSession, sessions_controller_1.patchMeController);
// End session (requires valid session)
exports.sessionsRouter.delete("/me", requireSession_1.requireSession, sessions_controller_1.deleteMeController);
exports.sessionsRouter.post("/socket-auth", sessions_controller_1.socketAuthController);
