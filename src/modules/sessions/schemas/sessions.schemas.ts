import { z } from "zod";

export const EnsureSessionSchema = z.object({
  nickname: z.string().trim().min(1).max(32).optional(),
  about: z.string().trim().max(280).optional(),
  avatarUrl: z.string().trim().url().optional(),
  fingerprint: z.string().trim().min(10).max(512).optional(),
});

export const UpdateMeSchema = z.object({
  nickname: z.string().trim().min(1).max(32).optional(),
  about: z.string().trim().max(280).optional(),
  avatarUrl: z.string().trim().url().optional(),
  // If you upload media later and want to link:
  avatarMediaId: z.string().trim().min(10).optional(),
});

export type EnsureSessionBody = z.infer<typeof EnsureSessionSchema>;
export type UpdateMeBody = z.infer<typeof UpdateMeSchema>;
