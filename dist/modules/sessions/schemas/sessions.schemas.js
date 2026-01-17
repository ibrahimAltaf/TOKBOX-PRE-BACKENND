"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMeSchema = exports.EnsureSessionSchema = void 0;
const zod_1 = require("zod");
exports.EnsureSessionSchema = zod_1.z.object({
    nickname: zod_1.z.string().trim().min(1).max(32).optional(),
    about: zod_1.z.string().trim().max(280).optional(),
    avatarUrl: zod_1.z.string().trim().url().optional(),
    fingerprint: zod_1.z.string().trim().min(10).max(512).optional(),
    // ✅ optional profile gallery + intro video
    photos: zod_1.z.array(zod_1.z.string().trim().url()).max(20).optional(),
    introVideoUrl: zod_1.z.string().trim().url().optional(),
});
exports.UpdateMeSchema = zod_1.z.object({
    nickname: zod_1.z.string().trim().min(1).max(32).optional(),
    about: zod_1.z.string().trim().max(280).optional(),
    avatarUrl: zod_1.z.string().trim().url().optional(),
    avatarMediaId: zod_1.z.string().trim().min(10).optional(),
    // ✅ gallery
    photos: zod_1.z.array(zod_1.z.string().trim().url()).max(20).optional(),
    photoMediaIds: zod_1.z.array(zod_1.z.string().trim().min(10)).max(20).optional(),
    // ✅ intro video
    introVideoUrl: zod_1.z.string().trim().url().optional(),
    introVideoMediaId: zod_1.z.string().trim().min(10).optional(),
});
