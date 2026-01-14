import { z } from "zod";

export const CreateInviteSchema = z.object({
  kind: z.enum(["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"]),
  roomId: z.string().trim().optional(),
  dmThreadId: z.string().trim().optional(),

  // If provided => internal invite (in-app)
  targetSessionId: z.string().trim().optional(),

  maxUses: z.coerce.number().int().min(1).max(50).default(1),

  // optional TTL minutes
  ttlMinutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 30)
    .optional(),
});

export const ListMyInvitesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const AcceptInviteSchema = z.object({
  token: z.string().trim().min(6),
});

export type CreateInviteBody = z.infer<typeof CreateInviteSchema>;
export type ListMyInvitesQuery = z.infer<typeof ListMyInvitesSchema>;
export type AcceptInviteBody = z.infer<typeof AcceptInviteSchema>;
