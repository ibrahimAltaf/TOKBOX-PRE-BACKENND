"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const users_controller_1 = require("../controllers/users.controller");
exports.usersRouter = (0, express_1.Router)();
// online list
exports.usersRouter.get("/online", users_controller_1.listOnlineUsersController);
