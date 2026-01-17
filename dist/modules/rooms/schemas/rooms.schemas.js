"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRoomSchema = exports.ListRoomsSchema = exports.CreateRoomSchema = void 0;
const zod_1 = require("zod");
const RoomTypeEnum = zod_1.z.enum(["PUBLIC", "PRIVATE", "VIDEO_GROUP", "VIDEO_1ON1"]);
exports.CreateRoomSchema = zod_1.z.object({
    type: RoomTypeEnum.default("PUBLIC"),
    slug: zod_1.z
        .string()
        .trim()
        .min(2)
        .max(64)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case")
        .optional(),
    title: zod_1.z.string().trim().min(1).max(80).optional(),
    maxUsers: zod_1.z.number().int().min(2).max(500).optional(),
});
exports.ListRoomsSchema = zod_1.z.object({
    type: RoomTypeEnum.optional(),
    q: zod_1.z.string().trim().max(80).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    cursor: zod_1.z.string().trim().optional(), // optional pagination cursor
});
exports.UpdateRoomSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(80).optional(),
    maxUsers: zod_1.z.number().int().min(2).max(500).optional(),
    isOpen: zod_1.z.boolean().optional(),
});
