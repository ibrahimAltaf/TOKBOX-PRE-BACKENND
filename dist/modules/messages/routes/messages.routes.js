"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRouter = void 0;
// src/modules/messages/routes/messages.routes.ts
const express_1 = require("express");
const requireSession_1 = require("../../sessions/middleware/requireSession");
const messages_controller_1 = require("../controllers/messages.controller");
exports.messagesRouter = (0, express_1.Router)();
// Rooms messages
exports.messagesRouter.get("/rooms/:roomId/messages", messages_controller_1.listRoomMessagesController);
exports.messagesRouter.post("/rooms/:roomId/messages", requireSession_1.requireSession, messages_controller_1.sendRoomMessageController);
