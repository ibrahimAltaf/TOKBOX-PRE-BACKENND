import type { Request, Response } from "express";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";
import {
  CreateThreadSchema,
  ListThreadsSchema,
  ListDmMessagesSchema,
  SendDmMessageSchema,
} from "../schemas/dm.schemas";
import {
  listThreadMessages,
  listThreads,
  openThread,
  sendDmMessage,
  toDmMessageResponse,
  toThreadResponse,
} from "../service/dm.service";

export async function createThreadController(req: Request, res: Response) {
  const parsed = CreateThreadSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;

  const out = await openThread({
    meSessionId,
    targetSessionId: parsed.data.targetSessionId,
  });
  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({
    ok: true,
    thread: toThreadResponse(out.thread, meSessionId),
  });
}

export async function listThreadsController(req: Request, res: Response) {
  const parsed = ListThreadsSchema.safeParse(req.query ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;

  const out = await listThreads({
    meSessionId,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });
  return res.json({
    ok: true,
    threads: out.threads.map((t) => toThreadResponse(t, meSessionId)),
    nextCursor: out.nextCursor,
  });
}

export async function listDmMessagesController(req: Request, res: Response) {
  const threadId = String(req.params.threadId || "").trim();

  const parsed = ListDmMessagesSchema.safeParse(req.query ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;

  const out = await listThreadMessages({
    meSessionId,
    threadId,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({
    ok: true,
    messages: out.messages.map(toDmMessageResponse),
    nextCursor: out.nextCursor,
  });
}

export async function sendDmMessageController(req: Request, res: Response) {
  const threadId = String(req.params.threadId || "").trim();

  const parsed = SendDmMessageSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;

  const out = await sendDmMessage({
    meSessionId,
    threadId,
    text: parsed.data.text,
    mediaUrls: parsed.data.mediaUrls,
    mediaIds: parsed.data.mediaIds,
  });

  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({
    ok: true,
    message: toDmMessageResponse(out.message),
    thread: toThreadResponse(out.thread, meSessionId),
  });
}
