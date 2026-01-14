import type { Request, Response } from "express";
import {
  SendMessageSchema,
  ListMessagesSchema,
} from "../schemas/messages.schemas";
import {
  listRoomMessages,
  sendRoomMessage,
  toMessageResponse,
} from "../service/messages.service";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";

export async function postRoomMessageController(req: Request, res: Response) {
  const roomId = String(req.params.roomId || "").trim();

  const parsed = SendMessageSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const senderSessionId = (req as AuthedRequest).session.id;

  const out = await sendRoomMessage({
    roomId,
    senderSessionId,
    text: parsed.data.text,
    mediaUrls: parsed.data.mediaUrls,
    mediaIds: parsed.data.mediaIds,
  });

  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({ ok: true, message: toMessageResponse(out.message) });
}

export async function getRoomMessagesController(req: Request, res: Response) {
  const roomId = String(req.params.roomId || "").trim();

  const parsed = ListMessagesSchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const out = await listRoomMessages({
    roomId,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({
    ok: true,
    messages: out.messages.map(toMessageResponse),
    nextCursor: out.nextCursor,
  });
}
