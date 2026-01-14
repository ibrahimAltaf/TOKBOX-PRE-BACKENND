import { Router } from "express";
import { requireSession } from "../../sessions/middleware/requireSession";
import { upload } from "../service/multer";
import { uploadMediaController } from "../controllers/media.controller";

export const mediaRouter = Router();

// multipart: files[] + folder
mediaRouter.post(
  "/upload",
  requireSession,
  upload.array("files", 10),
  uploadMediaController
);
