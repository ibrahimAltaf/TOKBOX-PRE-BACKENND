import { Request, Response } from "express";
import { z } from "zod";

import {
  listOnlineSessionIds,
  onlineCount,
} from "../../../realtime/presence/online.store";
import { getSessionsByIds } from "../service/users.service";

const OnlineQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(60),
  cursor: z.string().optional(),
});

export async function listOnlineUsersController(req: Request, res: Response) {
  const q = OnlineQuery.parse(req.query);

  const { sessionIds, nextCursor } = await listOnlineSessionIds({
    limit: q.limit,
    cursor: q.cursor,
  });

  const users = await getSessionsByIds(sessionIds);
  const totalOnline = await onlineCount();

  return res.json({
    ok: true,
    totalOnline,
    users,
    nextCursor,
  });
}
