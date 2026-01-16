// src/modules/invites/invite.model.ts
import { Schema, model, type InferSchemaType, Types } from "mongoose";

export type InviteKind = "ROOM" | "DM" | "VIDEO_GROUP" | "VIDEO_1ON1";
export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

const InviteSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },

    kind: {
      type: String,
      enum: ["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"],
      required: true,
      default: "PENDING",
      index: true,
    },

    inviterSessionId: {
      type: Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },

    targetSessionId: {
      type: Types.ObjectId,
      ref: "Session",
      default: null,
      index: true,
    },

    roomId: { type: Types.ObjectId, ref: "Room", default: null, index: true },

    dmThreadId: {
      type: Types.ObjectId,
      ref: "DmThread",
      default: null,
      index: true,
    },

    maxUses: { type: Number, required: true, default: 1 },
    uses: { type: Number, required: true, default: 0 },

    expiresAt: { type: Date, default: null, index: true },

    acceptedAt: { type: Date, default: null },
    acceptedBySessionId: { type: Types.ObjectId, ref: "Session", default: null },

    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InviteSchema.index({ targetSessionId: 1, status: 1, createdAt: -1 });
InviteSchema.index({ inviterSessionId: 1, createdAt: -1 });
InviteSchema.index({ expiresAt: 1 });

export type InviteDoc = InferSchemaType<typeof InviteSchema>;
export const InviteModel = model("Invite", InviteSchema);
