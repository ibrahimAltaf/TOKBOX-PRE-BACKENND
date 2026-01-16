import { Router } from "express";
import {
  deleteMeController,
  ensureSessionController,
  getMeController,
  patchMeController,socketAuthController
} from "../controllers/sessions.controller";
import { requireSession } from "../middleware/requireSession";

export const sessionsRouter = Router();

// Create/refresh anonymous session + set cookie
sessionsRouter.post("/ensure", ensureSessionController);

// Read current session (cookie-based)
sessionsRouter.get("/me", getMeController);

// Update current session (requires valid session)
sessionsRouter.patch("/me", requireSession, patchMeController);

// End session (requires valid session)
sessionsRouter.delete("/me", requireSession, deleteMeController);
sessionsRouter.post("/socket-auth", socketAuthController);
