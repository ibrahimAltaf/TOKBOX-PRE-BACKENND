import type { Request, Response } from "express";
import type { AuthedRequest } from "../../sessions/middleware/requireSession";
import {
  AcceptInviteSchema,
  CreateInviteSchema,
  ListMyInvitesSchema,
} from "../schemas/invites.schemas";
import {
  acceptInvite,
  createInvite,
  listIncomingInvites,
  revokeInvite,
  toInviteResponse,
  getInviteByToken,
} from "../service/invites.service";

export async function createInviteController(req: Request, res: Response) {
  const parsed = CreateInviteSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const inviterSessionId = (req as AuthedRequest).session.id;

  const out = await createInvite({
    inviterSessionId,
    kind: parsed.data.kind,
    roomId: parsed.data.roomId,
    dmThreadId: parsed.data.dmThreadId,
    targetSessionId: parsed.data.targetSessionId,
    maxUses: parsed.data.maxUses,
    ttlMinutes: parsed.data.ttlMinutes,
  });

  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  // client will build a URL on frontend: `${APP_URL}/invite/${token}`
  return res.json({ ok: true, invite: toInviteResponse(out.invite) });
}

export async function listIncomingInvitesController(
  req: Request,
  res: Response
) {
  const parsed = ListMyInvitesSchema.safeParse(req.query ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;

  const out = await listIncomingInvites({
    meSessionId,
    limit: parsed.data.limit,
  });
  return res.json({ ok: true, invites: out.invites.map(toInviteResponse) });
}

export async function previewInviteController(req: Request, res: Response) {
  const token = String(req.params.token || "").trim();
  const out = await getInviteByToken(token);
  if (!out.ok) return res.status(404).json({ ok: false, error: out.error });

  return res.json({ ok: true, invite: toInviteResponse(out.invite) });
}

export async function acceptInviteController(req: Request, res: Response) {
  const parsed = AcceptInviteSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const meSessionId = (req as AuthedRequest).session.id;

  const out = await acceptInvite({ meSessionId, token: parsed.data.token });
  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({ ok: true, invite: toInviteResponse(out.invite) });
}

export async function revokeInviteController(req: Request, res: Response) {
  const token = String(req.params.token || "").trim();
  const meSessionId = (req as AuthedRequest).session.id;

  const out = await revokeInvite({ meSessionId, token });
  if (!out.ok) return res.status(400).json({ ok: false, error: out.error });

  return res.json({ ok: true, invite: toInviteResponse(out.invite) });
}
