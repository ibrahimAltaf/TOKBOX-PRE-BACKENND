"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptInviteSchema = exports.ListMyInvitesSchema = exports.CreateInviteSchema = void 0;
const zod_1 = require("zod");
exports.CreateInviteSchema = zod_1.z.object({
    kind: zod_1.z.enum(["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"]),
    roomId: zod_1.z.string().trim().optional(),
    dmThreadId: zod_1.z.string().trim().optional(),
    // If provided => internal invite (in-app)
    targetSessionId: zod_1.z.string().trim().optional(),
    maxUses: zod_1.z.coerce.number().int().min(1).max(50).default(1),
    // optional TTL minutes
    ttlMinutes: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(60 * 24 * 30)
        .optional(),
});
exports.ListMyInvitesSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
});
exports.AcceptInviteSchema = zod_1.z.object({
    token: zod_1.z.string().trim().min(6),
});
