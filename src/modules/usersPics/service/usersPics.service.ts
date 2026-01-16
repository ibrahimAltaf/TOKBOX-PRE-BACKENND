import mongoose from "mongoose";
import { SessionModel } from "../../sessions/session.model";
import { listOnlineSessionIds } from "../../../realtime/presence/online.store";
import { redis } from "../../../lib/redis";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ONLINE_ZSET = "online:sessions:z"; // must match online.store.ts

export async function listUserPics(args: {
  q?: string;
  limit: number;
  onlineOnly: boolean;
  cursor?: string;
}) {
  const limit = Math.max(1, Math.min(200, Number(args.limit || 60)));
  const onlineOnly = !!args.onlineOnly;

  if (onlineOnly) {
    // get ordered online IDs + cursor (score-based)
    const online = await listOnlineSessionIds({
      limit: Math.max(limit * 3, 60),
      cursor: args.cursor,
    });

    const onlineIds = online.sessionIds.filter(isValidObjectId);
    if (!onlineIds.length) return { users: [] as any[], nextCursor: null };

    const where: any = {
      _id: { $in: onlineIds.map((x) => new mongoose.Types.ObjectId(x)) },
      endedAt: null,
    };

    if (args.q) {
      const re = new RegExp(escapeRe(args.q), "i");
      where.$or = [{ nickname: re }, { about: re }, { geoLabel: re }];
    }

    const docs = await SessionModel.find(where)
      .select({
        nickname: 1,
        about: 1,
        avatarUrl: 1,
        photos: 1,
        geoLabel: 1,
        lat: 1,
        lng: 1,
        lastSeenAt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .lean();

    // preserve online ordering
    const byId = new Map<string, any>();
    for (const d of docs) byId.set(String((d as any)._id), d);

    const users = onlineIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter((u: any) => (u.photos?.length || 0) > 0 || !!u.avatarUrl)
      .slice(0, limit)
      .map((u: any) => ({
        id: String(u._id),
        nickname: u.nickname ?? null,
        about: u.about ?? null,
        avatarUrl: u.avatarUrl ?? null,
        photos: u.photos ?? [],
        geoLabel: u.geoLabel ?? null,
        lat: u.lat ?? null,
        lng: u.lng ?? null,
        lastSeenAt: u.lastSeenAt ?? null,
        online: true,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

    return { users, nextCursor: online.nextCursor };
  }

  // Not onlineOnly: fetch sessions then mark online in batch (no N+1)
  const where: any = { endedAt: null };

  if (args.q) {
    const re = new RegExp(escapeRe(args.q), "i");
    where.$or = [{ nickname: re }, { about: re }, { geoLabel: re }];
  }

  const docs = await SessionModel.find(where)
    .select({
      nickname: 1,
      about: 1,
      avatarUrl: 1,
      photos: 1,
      geoLabel: 1,
      lat: 1,
      lng: 1,
      lastSeenAt: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ lastSeenAt: -1, updatedAt: -1 })
    .limit(limit)
    .lean();

  const ids = docs.map((u: any) => String(u._id));

  // batch online check: ZSCORE in pipeline
  const pipe = redis.pipeline();
  for (const id of ids) pipe.zscore(ONLINE_ZSET, id);

  const results = (await pipe.exec()) ?? []; // ✅ exec can be null

  const onlineMap = new Map<string, boolean>();
  results.forEach((r, i) => {
    const val = r?.[1];
    onlineMap.set(ids[i], val !== null && val !== undefined);
  });

  const users = docs.map((u: any) => {
    const id = String((u as any)._id);

    return {
      id,
      nickname: (u as any).nickname ?? null,
      about: (u as any).about ?? null,
      avatarUrl: (u as any).avatarUrl ?? null,
      photos: (u as any).photos ?? [],
      geoLabel: (u as any).geoLabel ?? null,
      lat: (u as any).lat ?? null,
      lng: (u as any).lng ?? null,
      lastSeenAt: (u as any).lastSeenAt ?? null,
      online: onlineMap.get(id) ?? false,
      createdAt: (u as any).createdAt,
      updatedAt: (u as any).updatedAt,
    };
  });

  return { users, nextCursor: null };
}
