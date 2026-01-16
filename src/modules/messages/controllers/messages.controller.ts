// src/modules/messages/controllers/messages.controller.ts
import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";
import {
  listRoomMessages,
  sendRoomMessage,
  toMessageResponse,
} from "../service/messages.service";

const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

const SendBody = z.object({
  text: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
});

export async function listRoomMessagesController(req: Request, res: Response) {
  const roomId = String(req.params.roomId || "");
  const q = ListQuery.parse(req.query);

  const out = await listRoomMessages({
    roomId,
    limit: q.limit,
    cursor: q.cursor,
  });

  if (!out.ok) return res.status(400).json(out);

  // NOTE: your service returns newest-first; many UIs prefer oldest-first
  // If your frontend expects newest-first, remove `.reverse()`.
  const items = out.messages.map(toMessageResponse).reverse();

  return res.json({
    ok: true,
    messages: items,
    nextCursor: out.nextCursor,
  });
}

export async function sendRoomMessageController(req: Request, res: Response) {
  const roomId = String(req.params.roomId || "");
  const meSessionId = (req as AuthedRequest).session.id;
  const body = SendBody.parse(req.body);

  const out = await sendRoomMessage({
    roomId,
    senderSessionId: meSessionId,
    text: body.text,
    mediaUrls: body.mediaUrls,
    mediaIds: body.mediaIds,
  });

  if (!out.ok) return res.status(400).json(out);

  return res.json({ ok: true, message: toMessageResponse(out.message) });
}
