import { Schema, model, type InferSchemaType, Types } from "mongoose";

const SessionSchema = new Schema(
  {
    sessionKey: { type: String, required: true, unique: true, index: true },

    nickname: { type: String, default: null },
    about: { type: String, default: null },

    // Avatar
    avatarUrl: { type: String, default: null },
    avatarMediaId: { type: Types.ObjectId, ref: "Media", default: null },

    // ✅ Gallery (URLs + optional Media ids)
    photos: { type: [String], default: [] },
    photoMediaIds: { type: [Types.ObjectId], ref: "Media", default: [] },

    // ✅ Intro video
    introVideoUrl: { type: String, default: null },
    introVideoMediaId: { type: Types.ObjectId, ref: "Media", default: null },

    fingerprintHash: { type: String, default: null, index: true },
    ipHash: { type: String, default: null, index: true },

    lastSeenAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date, default: null, index: true },

    isOnline: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

SessionSchema.index({ lastSeenAt: -1 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export const SessionModel = model("Session", SessionSchema);
