import { Router } from "express";
import { listUserPicsController } from "../controllers/usersPics.controller";

export const usersPicsRouter = Router();

usersPicsRouter.get("/", listUserPicsController);
