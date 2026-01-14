import { Router } from "express";
import { listUserPicsController } from "../controllers/usersPics.controller";

export const usersPicsRouter = Router();

// GET /users-pics?q=&limit=&onlineOnly=
usersPicsRouter.get("/", listUserPicsController);
