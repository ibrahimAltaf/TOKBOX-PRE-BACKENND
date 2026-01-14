import mongoose from "mongoose";
import { SessionModel } from "../../sessions/session.model";

function isValidObjectId(id: string) {
  return mongoose.isValidObjectId(id);
}

export async function getSessionsByIds(sessionIds: string[]) {
  const ids = sessionIds
    .filter(isValidObjectId)
    .map((x) => new mongoose.Types.ObjectId(x));
  if (!ids.length) return [];

  // IMPORTANT: select fields which your frontend needs
  const sessions = await SessionModel.find({ _id: { $in: ids }, endedAt: null })
    .select({
      nickname: 1,
      about: 1,
      avatarUrl: 1,
      geoLabel: 1,
      lat: 1,
      lng: 1,
      photos: 1,
      lastSeenAt: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .lean();

  // keep same order as input
  const map = new Map(sessions.map((s: any) => [String(s._id), s]));
  return sessionIds.map((id) => map.get(id)).filter(Boolean);
}
