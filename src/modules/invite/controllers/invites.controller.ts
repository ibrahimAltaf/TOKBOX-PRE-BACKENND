// src/modules/invites/controllers/invites.controller.ts
import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";
import {
  acceptInvite,
  createInvite,
  getInviteByToken,
  listIncomingInvites,
  revokeInvite,
  toInviteResponse,
} from "../service/invites.service";

function inviteAction(inv: any) {
  if (inv.kind === "DM") return { type: "OPEN_DM", dmThreadId: inv.dmThreadId ?? null };
  if (inv.kind === "ROOM") return { type: "JOIN_ROOM", roomId: inv.roomId ?? null };
  if (inv.kind === "VIDEO_GROUP") return { type: "JOIN_VIDEO_GROUP", roomId: inv.roomId ?? null };
  if (inv.kind === "VIDEO_1ON1") return { type: "JOIN_VIDEO_1ON1", roomId: inv.roomId ?? null };
  return { type: "UNKNOWN" };
}

const CreateBody = z.object({
  kind: z.enum(["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"]),
  roomId: z.string().optional(),
  dmThreadId: z.string().optional(),
  targetSessionId: z.string().optional(),
  maxUses: z.coerce.number().int().min(1).max(50).default(1),
  ttlMinutes: z.coerce.number().int().min(1).max(60 * 24 * 30).optional(),
});

export async function createInviteController(req: Request, res: Response) {
  const meSessionId = (req as AuthedRequest).session.id;
  const body = CreateBody.parse(req.body);

  const out = await createInvite({
    inviterSessionId: meSessionId,
    kind: body.kind,
    roomId: body.roomId,
    dmThreadId: body.dmThreadId,
    targetSessionId: body.targetSessionId,
    maxUses: body.maxUses,
    ttlMinutes: body.ttlMinutes,
  });

  if (!out.ok) return res.status(400).json(out);

  const inv = toInviteResponse(out.invite);
  return res.json({ ok: true, invite: inv, action: inviteAction(inv) });
}

export async function listIncomingInvitesController(req: Request, res: Response) {
  const meSessionId = (req as AuthedRequest).session.id;
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));

  const out = await listIncomingInvites({ meSessionId, limit });
  if (!out.ok) return res.status(400).json(out);

  const items = out.invites.map((x: any) => {
    const inv = toInviteResponse(x);
    return { invite: inv, action: inviteAction(inv) };
  });

  return res.json({ ok: true, items });
}

export async function getInviteController(req: Request, res: Response) {
  const token = String(req.params.token || "");
  const out = await getInviteByToken(token);
  if (!out.ok) return res.status(404).json(out);

  const inv = toInviteResponse(out.invite);
  return res.json({ ok: true, invite: inv, action: inviteAction(inv) });
}

export async function acceptInviteController(req: Request, res: Response) {
  const meSessionId = (req as AuthedRequest).session.id;
  const token = String(req.params.token || "");

  const out = await acceptInvite({ meSessionId, token });
  if (!out.ok) return res.status(400).json(out);

  const inv = toInviteResponse(out.invite);
  return res.json({ ok: true, invite: inv, action: inviteAction(inv) });
}

export async function revokeInviteController(req: Request, res: Response) {
  const meSessionId = (req as AuthedRequest).session.id;
  const token = String(req.params.token || "");

  const out = await revokeInvite({ meSessionId, token });
  if (!out.ok) return res.status(400).json(out);

  const inv = toInviteResponse(out.invite);
  return res.json({ ok: true, invite: inv });
}
