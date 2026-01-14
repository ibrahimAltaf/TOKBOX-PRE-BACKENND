import { Schema, model, type InferSchemaType, Types } from "mongoose";

const DmThreadSchema = new Schema(
  {
    sessionAId: {
      type: Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    sessionBId: {
      type: Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },

    lastMessageAt: { type: Date, default: null, index: true },

    // Optional (read receipts later)
    lastReadAtA: { type: Date, default: null },
    lastReadAtB: { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique pair (A,B) in sorted order (enforced in service)
DmThreadSchema.index({ sessionAId: 1, sessionBId: 1 }, { unique: true });
DmThreadSchema.index({ lastMessageAt: -1 });

export type DmThreadDoc = InferSchemaType<typeof DmThreadSchema>;
export const DmThreadModel = model("DmThread", DmThreadSchema);
