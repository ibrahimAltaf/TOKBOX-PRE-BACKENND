import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";
import {
  banMember,
  joinRoom,
  kickMember,
  leaveRoom,
  listRoomMembers,
  toRoomMemberResponse,
} from "../service/roomMembers.service";

const JoinSchema = z.object({ roomId: z.string().trim() });
const LeaveSchema = z.object({ roomId: z.string().trim() });

const ListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const KickSchema = z.object({
  targetSessionId: z.string().trim(),
});

const BanSchema = z.object({
  targetSessionId: z.string().trim(),
  minutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 30)
    .default(60),
});

export async function joinRoomController(req: Request, res: Response) {
  const parsed = JoinSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;
  const out = await joinRoom({
    roomId: parsed.data.roomId,
    sessionId: meSessionId,
  });

  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({
    ok: true,
    role: out.role,
    member: toRoomMemberResponse(out.member),
  });
}

export async function leaveRoomController(req: Request, res: Response) {
  const parsed = LeaveSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;
  const out = await leaveRoom({
    roomId: parsed.data.roomId,
    sessionId: meSessionId,
  });

  return res.json({
    ok: true,
    member: out.member ? toRoomMemberResponse(out.member) : null,
  });
}

export async function listRoomMembersController(req: Request, res: Response) {
  const roomId = String(req.params.roomId || "").trim();
  const parsed = ListSchema.safeParse(req.query ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const out = await listRoomMembers({ roomId, limit: parsed.data.limit });
  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({ ok: true, members: out.members.map(toRoomMemberResponse) });
}

export async function kickMemberController(req: Request, res: Response) {
  const roomId = String(req.params.roomId || "").trim();
  const body = KickSchema.safeParse(req.body ?? {});
  if (!body.success)
    return res.status(400).json({ ok: false, error: body.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;
  const out = await kickMember({
    roomId,
    meSessionId,
    targetSessionId: body.data.targetSessionId,
  });

  if (!out.ok) return res.status(403).json({ ok: false, error: out.error });

  return res.json({ ok: true, member: toRoomMemberResponse(out.member) });
}

export async function banMemberController(req: Request, res: Response) {
  const roomId = String(req.params.roomId || "").trim();
  const body = BanSchema.safeParse(req.body ?? {});
  if (!body.success)
    return res.status(400).json({ ok: false, error: body.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;
  const out = await banMember({
    roomId,
    meSessionId,
    targetSessionId: body.data.targetSessionId,
    minutes: body.data.minutes,
  });

  if (!out.ok) return res.status(403).json({ ok: false, error: out.error });

  return res.json({ ok: true, member: toRoomMemberResponse(out.member) });
}
