import type { Request, Response } from "express";
import {
  CreateRoomSchema,
  ListRoomsSchema,
  UpdateRoomSchema,
} from "../schemas/rooms.schemas";
import {
  closeRoom,
  createRoom,
  getRoomById,
  listPublicRooms,
  toRoomResponse,
  updateRoom,
} from "../service/rooms.service";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";

export async function createRoomController(req: Request, res: Response) {
  const parsed = CreateRoomSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  // owner is optional at REST stage, but we attach if session exists (authenticated route recommended)
  const ownerSessionId = (req as Partial<AuthedRequest>).session?.id ?? null;

  const doc = await createRoom({
    type: parsed.data.type,
    slug: parsed.data.slug,
    title: parsed.data.title,
    maxUsers: parsed.data.maxUsers,
    ownerSessionId,
  });

  return res.json({ ok: true, room: toRoomResponse(doc) });
}

export async function listRoomsController(req: Request, res: Response) {
  const parsed = ListRoomsSchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const out = await listPublicRooms({
    type: parsed.data.type,
    q: parsed.data.q,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  return res.json({
    ok: true,
    rooms: out.rooms.map(toRoomResponse),
    nextCursor: out.nextCursor,
  });
}

export async function getRoomController(req: Request, res: Response) {
  const id = String(req.params.id || "").trim();
  const r = await getRoomById(id);
  if (!r) return res.status(404).json({ ok: false, error: "Room not found" });

  return res.json({ ok: true, room: toRoomResponse(r) });
}

export async function patchRoomController(req: Request, res: Response) {
  const id = String(req.params.id || "").trim();

  const parsed = UpdateRoomSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const r = await updateRoom({
    roomId: id,
    title: parsed.data.title,
    maxUsers: parsed.data.maxUsers,
    isOpen: parsed.data.isOpen,
  });

  if (!r) return res.status(404).json({ ok: false, error: "Room not found" });

  return res.json({ ok: true, room: toRoomResponse(r) });
}

export async function deleteRoomController(req: Request, res: Response) {
  const id = String(req.params.id || "").trim();
  const r = await closeRoom(id);

  if (!r) return res.status(404).json({ ok: false, error: "Room not found" });

  return res.json({ ok: true, room: toRoomResponse(r) });
}
