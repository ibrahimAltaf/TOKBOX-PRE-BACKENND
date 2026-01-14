import { Request, Response } from "express";
import { z } from "zod";
import { listUserPics } from "../service/usersPics.service";

const Query = z.object({
  q: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(60),
  onlineOnly: z.coerce.boolean().optional().default(true),
});

export async function listUserPicsController(req: Request, res: Response) {
  const q = Query.parse(req.query);

  const out = await listUserPics({
    q: q.q,
    limit: q.limit,
    onlineOnly: q.onlineOnly,
  });

  return res.json({ ok: true, users: out.users });
}
