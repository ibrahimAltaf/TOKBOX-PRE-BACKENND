"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRouter = void 0;
const express_1 = require("express");
const requireSession_1 = require("../../sessions/middleware/requireSession");
const multer_1 = require("../service/multer");
const media_controller_1 = require("../controllers/media.controller");
exports.mediaRouter = (0, express_1.Router)();
// multipart: files[] + folder
exports.mediaRouter.post("/upload", requireSession_1.requireSession, multer_1.upload.array("files", 10), media_controller_1.uploadMediaController);
