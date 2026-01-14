import { Schema, model, type InferSchemaType, Types } from "mongoose";

const SessionSchema = new Schema(
  {
    sessionKey: { type: String, required: true, unique: true, index: true },

    nickname: { type: String, default: null },
    about: { type: String, default: null },

    // Avatar is stored as URL + optional media reference
    avatarUrl: { type: String, default: null },
    avatarMediaId: { type: Types.ObjectId, ref: "Media", default: null },

    // Privacy-friendly enforcement keys (store hashes, not raw values)
    fingerprintHash: { type: String, default: null, index: true },
    ipHash: { type: String, default: null, index: true },

    // Lifecycle
    lastSeenAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date, default: null, index: true },

    // Realtime convenience flag (source of truth will be Redis later)
    isOnline: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

SessionSchema.index({ lastSeenAt: -1 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export const SessionModel = model("Session", SessionSchema);
