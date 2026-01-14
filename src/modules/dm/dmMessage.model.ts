import { Schema, model, type InferSchemaType, Types } from "mongoose";

const DmMessageSchema = new Schema(
  {
    threadId: {
      type: Types.ObjectId,
      ref: "DmThread",
      required: true,
      index: true,
    },
    senderSessionId: {
      type: Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },

    text: { type: String, default: null },
    mediaUrls: { type: [String], default: [] },
    mediaIds: { type: [Types.ObjectId], ref: "Media", default: [] },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

DmMessageSchema.index({ threadId: 1, createdAt: -1 });

export type DmMessageDoc = InferSchemaType<typeof DmMessageSchema>;
export const DmMessageModel = model("DmMessage", DmMessageSchema);
