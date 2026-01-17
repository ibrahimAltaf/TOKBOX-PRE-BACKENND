"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListMessagesSchema = exports.SendMessageSchema = void 0;
const zod_1 = require("zod");
exports.SendMessageSchema = zod_1.z.object({
    text: zod_1.z.string().trim().min(1).max(2000).optional(),
    mediaUrls: zod_1.z.array(zod_1.z.string().trim().url()).max(10).optional(),
    mediaIds: zod_1.z.array(zod_1.z.string().trim().min(10)).max(10).optional(),
});
exports.ListMessagesSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
    cursor: zod_1.z.string().trim().optional(), // ISO date cursor
});
