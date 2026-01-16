import { z } from "zod";

export const EnsureSessionSchema = z.object({
  nickname: z.string().trim().min(1).max(32).optional(),
  about: z.string().trim().max(280).optional(),
  avatarUrl: z.string().trim().url().optional(),
  fingerprint: z.string().trim().min(10).max(512).optional(),

  // ✅ optional profile gallery + intro video
  photos: z.array(z.string().trim().url()).max(20).optional(),
  introVideoUrl: z.string().trim().url().optional(),
});

export const UpdateMeSchema = z.object({
  nickname: z.string().trim().min(1).max(32).optional(),
  about: z.string().trim().max(280).optional(),
  avatarUrl: z.string().trim().url().optional(),

  avatarMediaId: z.string().trim().min(10).optional(),

  // ✅ gallery
  photos: z.array(z.string().trim().url()).max(20).optional(),
  photoMediaIds: z.array(z.string().trim().min(10)).max(20).optional(),

  // ✅ intro video
  introVideoUrl: z.string().trim().url().optional(),
  introVideoMediaId: z.string().trim().min(10).optional(),
});

export type EnsureSessionBody = z.infer<typeof EnsureSessionSchema>;
export type UpdateMeBody = z.infer<typeof UpdateMeSchema>;
