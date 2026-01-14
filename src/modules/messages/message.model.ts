import { Schema, model, type InferSchemaType, Types } from "mongoose";

export type MessageType = "TEXT" | "SYSTEM";

const MessageSchema = new Schema(
  {
    roomId: { type: Types.ObjectId, ref: "Room", required: true, index: true },

    senderSessionId: {
      type: Types.ObjectId,
      ref: "Session",
      default: null,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["TEXT", "SYSTEM"],
      index: true,
    },

    text: { type: String, default: null },

    // For now store URLs; later we can also store mediaIds
    mediaUrls: { type: [String], default: [] },
    mediaIds: { type: [Types.ObjectId], ref: "Media", default: [] },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

MessageSchema.index({ roomId: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof MessageSchema>;
export const MessageModel = model("Message", MessageSchema);
