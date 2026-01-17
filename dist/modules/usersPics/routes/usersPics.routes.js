"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersPicsRouter = void 0;
const express_1 = require("express");
const usersPics_controller_1 = require("../controllers/usersPics.controller");
exports.usersPicsRouter = (0, express_1.Router)();
exports.usersPicsRouter.get("/", usersPics_controller_1.listUserPicsController);
