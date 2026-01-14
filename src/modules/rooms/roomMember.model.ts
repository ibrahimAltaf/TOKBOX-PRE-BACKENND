import { Schema, model, type InferSchemaType, Types } from "mongoose";

const RoomMemberSchema = new Schema(
  {
    roomId: { type: Types.ObjectId, ref: "Room", required: true, index: true },
    sessionId: {
      type: Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["OWNER", "MEMBER"],
      required: true,
      default: "MEMBER",
    },

    joinedAt: { type: Date, required: true, default: () => new Date() },
    leftAt: { type: Date, default: null },

    kickedAt: { type: Date, default: null },
    kickedBySessionId: { type: Types.ObjectId, ref: "Session", default: null },

    bannedUntil: { type: Date, default: null },
    bannedBySessionId: { type: Types.ObjectId, ref: "Session", default: null },

    // optional: track lastSeen for UI
    lastSeenAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

// one active membership per room+session
RoomMemberSchema.index({ roomId: 1, sessionId: 1 }, { unique: true });

export type RoomMemberDoc = InferSchemaType<typeof RoomMemberSchema>;
export const RoomMemberModel = model("RoomMember", RoomMemberSchema);
