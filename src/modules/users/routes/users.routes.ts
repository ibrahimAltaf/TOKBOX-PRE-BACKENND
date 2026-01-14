import { Router } from "express";
import { listOnlineUsersController } from "../controllers/users.controller";

export const usersRouter = Router();

// online list
usersRouter.get("/online", listOnlineUsersController);
