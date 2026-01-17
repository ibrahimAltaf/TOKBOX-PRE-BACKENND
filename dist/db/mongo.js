"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
exports.disconnectMongo = disconnectMongo;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
async function connectMongo() {
    if (!env_1.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables.");
    }
    mongoose_1.default.set("strictQuery", true);
    if (env_1.env.NODE_ENV !== "production") {
        mongoose_1.default.set("debug", false);
    }
    await mongoose_1.default.connect(env_1.env.MONGO_URI, {
        autoIndex: env_1.env.NODE_ENV !== "production",
    });
    console.log("[mongo] connected");
}
async function disconnectMongo() {
    await mongoose_1.default.disconnect();
    console.log("[mongo] disconnected");
}
