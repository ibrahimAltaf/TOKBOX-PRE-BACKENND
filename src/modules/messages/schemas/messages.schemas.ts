import { z } from "zod";

export const SendMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000).optional(),
  mediaUrls: z.array(z.string().trim().url()).max(10).optional(),
  mediaIds: z.array(z.string().trim().min(10)).max(10).optional(),
});

export const ListMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().trim().optional(), // ISO date cursor
});

export type SendMessageBody = z.infer<typeof SendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof ListMessagesSchema>;
