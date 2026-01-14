import { Schema, model, type InferSchemaType, Types } from "mongoose";

export type MediaType = "IMAGE" | "VIDEO" | "AUDIO" | "OTHER";

const MediaSchema = new Schema(
  {
    uploaderSessionId: {
      type: Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["IMAGE", "VIDEO", "AUDIO", "OTHER"],
      index: true,
    },
    mime: { type: String, required: true },
    size: { type: Number, required: true },

    url: { type: String, required: true },
    storageKey: { type: String, required: true, index: true },

    expiresAt: { type: Date, default: null, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export type MediaDoc = InferSchemaType<typeof MediaSchema>;
export const MediaModel = model("Media", MediaSchema);
