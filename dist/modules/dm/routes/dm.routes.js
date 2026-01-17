"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmRouter = void 0;
const express_1 = require("express");
const requireSession_1 = require("../../sessions/middleware/requireSession");
const dm_controller_1 = require("../controllers/dm.controller");
exports.dmRouter = (0, express_1.Router)();
// all DM endpoints require session
exports.dmRouter.use(requireSession_1.requireSession);
exports.dmRouter.post("/threads", dm_controller_1.createThreadController);
exports.dmRouter.get("/threads", dm_controller_1.listThreadsController);
exports.dmRouter.get("/threads/:threadId/messages", dm_controller_1.listDmMessagesController);
exports.dmRouter.post("/threads/:threadId/messages", dm_controller_1.sendDmMessageController);
