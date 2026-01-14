import mongoose from "mongoose";
import { SessionModel } from "../../sessions/session.model"; 
import {
  listOnlineSessionIds,
  isSessionOnline,
} from "../../../realtime/presence/online.store";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listUserPics(args: {
  q?: string;
  limit: number;
  onlineOnly: boolean;
}) {
  const limit = Math.max(1, Math.min(200, Number(args.limit || 60)));
  const onlineOnly = !!args.onlineOnly;

  // If onlineOnly => get online IDs from redis then query Mongo by _id in [ids]
  if (onlineOnly) {
    // pull more than limit because some sessions could be ended/null
    const scan = await listOnlineSessionIds({ limit: Math.max(limit * 3, 60) });

    const onlineIds = scan.sessionIds.filter(isValidObjectId);
    if (!onlineIds.length) return { users: [] as any[] };

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
      .limit(limit)
      .lean();

    // keep only users that have pics (optional, typical in BullChat)
    const users = docs
      .filter((u: any) => (u.photos?.length || 0) > 0 || !!u.avatarUrl)
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

    return { users };
  }

  // If not onlineOnly => query latest sessions (endedAt null) and compute online flag
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

  const users = [];
  for (const u of docs) {
    const id = String((u as any)._id);
    const online = await isSessionOnline(id);

    users.push({
      id,
      nickname: (u as any).nickname ?? null,
      about: (u as any).about ?? null,
      avatarUrl: (u as any).avatarUrl ?? null,
      photos: (u as any).photos ?? [],
      geoLabel: (u as any).geoLabel ?? null,
      lat: (u as any).lat ?? null,
      lng: (u as any).lng ?? null,
      lastSeenAt: (u as any).lastSeenAt ?? null,
      online,
      createdAt: (u as any).createdAt,
      updatedAt: (u as any).updatedAt,
    });
  }

  return { users };
}
