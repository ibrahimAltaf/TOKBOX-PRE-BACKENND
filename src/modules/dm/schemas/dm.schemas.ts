import { z } from "zod";

export const CreateThreadSchema = z.object({
  targetSessionId: z.string().trim().min(10),
});

export const ListThreadsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().trim().optional(), // ISO date cursor (lastMessageAt)
});

export const ListDmMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().trim().optional(), // ISO date cursor (createdAt)
});

export const SendDmMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000).optional(),
  mediaUrls: z.array(z.string().trim().url()).max(10).optional(),
  mediaIds: z.array(z.string().trim().min(10)).max(10).optional(),
});

export type CreateThreadBody = z.infer<typeof CreateThreadSchema>;
export type ListThreadsQuery = z.infer<typeof ListThreadsSchema>;
export type ListDmMessagesQuery = z.infer<typeof ListDmMessagesSchema>;
export type SendDmMessageBody = z.infer<typeof SendDmMessageSchema>;
