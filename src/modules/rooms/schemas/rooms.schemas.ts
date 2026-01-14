import { z } from "zod";

const RoomTypeEnum = z.enum(["PUBLIC", "PRIVATE", "VIDEO_GROUP", "VIDEO_1ON1"]);

export const CreateRoomSchema = z.object({
  type: RoomTypeEnum.default("PUBLIC"),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case")
    .optional(),
  title: z.string().trim().min(1).max(80).optional(),
  maxUsers: z.number().int().min(2).max(500).optional(),
});

export const ListRoomsSchema = z.object({
  type: RoomTypeEnum.optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().optional(), // optional pagination cursor
});

export const UpdateRoomSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  maxUsers: z.number().int().min(2).max(500).optional(),
  isOpen: z.boolean().optional(),
});

export type CreateRoomBody = z.infer<typeof CreateRoomSchema>;
export type ListRoomsQuery = z.infer<typeof ListRoomsSchema>;
export type UpdateRoomBody = z.infer<typeof UpdateRoomSchema>;
