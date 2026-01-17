"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvite = createInvite;
exports.listIncomingInvites = listIncomingInvites;
exports.getInviteByToken = getInviteByToken;
exports.acceptInvite = acceptInvite;
exports.revokeInvite = revokeInvite;
exports.toInviteResponse = toInviteResponse;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const invite_model_1 = require("../invite.model");
function isValidObjectId(id) {
    return mongoose_1.default.isValidObjectId(id);
}
function oid(id) {
    return new mongoose_1.default.Types.ObjectId(id);
}
function makeToken() {
    return crypto_1.default.randomBytes(18).toString("base64url");
}
function now() {
    return new Date();
}
function isExpired(inv) {
    return !!inv.expiresAt && new Date(inv.expiresAt).getTime() <= Date.now();
}
async function createInvite(args) {
    // validation
    if (args.kind === "ROOM" ||
        args.kind === "VIDEO_GROUP" ||
        args.kind === "VIDEO_1ON1") {
        if (!args.roomId || !isValidObjectId(args.roomId)) {
            return { ok: false, error: "roomId is required for this kind" };
        }
    }
    if (args.kind === "DM") {
        if (!args.dmThreadId || !isValidObjectId(args.dmThreadId)) {
            return {
                ok: false,
                error: "dmThreadId is required for DM kind",
            };
        }
    }
    if (args.targetSessionId && !isValidObjectId(args.targetSessionId)) {
        return { ok: false, error: "Invalid targetSessionId" };
    }
    const token = makeToken();
    const expiresAt = typeof args.ttlMinutes === "number"
        ? new Date(Date.now() + args.ttlMinutes * 60_000)
        : null;
    const doc = await invite_model_1.InviteModel.create({
        token,
        kind: args.kind,
        inviterSessionId: oid(args.inviterSessionId),
        targetSessionId: args.targetSessionId ? oid(args.targetSessionId) : null,
        roomId: args.roomId ? oid(args.roomId) : null,
        dmThreadId: args.dmThreadId ? oid(args.dmThreadId) : null,
        status: "PENDING",
        maxUses: args.maxUses,
        uses: 0,
        expiresAt,
        acceptedAt: null,
        acceptedBySessionId: null,
        revokedAt: null,
    });
    return { ok: true, invite: doc.toObject() };
}
async function listIncomingInvites(args) {
    const invites = await invite_model_1.InviteModel.find({
        targetSessionId: oid(args.meSessionId),
        status: "PENDING",
    })
        .sort({ createdAt: -1 })
        .limit(args.limit)
        .lean();
    return { ok: true, invites };
}
async function getInviteByToken(token) {
    const inv = await invite_model_1.InviteModel.findOne({ token }).lean();
    if (!inv)
        return { ok: false, error: "Invite not found" };
    if (inv.status !== "PENDING") {
        return { ok: false, error: `Invite is ${inv.status}` };
    }
    if (isExpired(inv)) {
        await invite_model_1.InviteModel.updateOne({ _id: inv._id }, { $set: { status: "EXPIRED" } });
        return { ok: false, error: "Invite expired" };
    }
    if (inv.maxUses && inv.uses >= inv.maxUses) {
        await invite_model_1.InviteModel.updateOne({ _id: inv._id }, { $set: { status: "EXPIRED" } });
        return { ok: false, error: "Invite max uses reached" };
    }
    return { ok: true, invite: inv };
}
async function acceptInvite(args) {
    const inv = await invite_model_1.InviteModel.findOne({ token: args.token });
    if (!inv)
        return { ok: false, error: "Invite not found" };
    if (inv.status !== "PENDING") {
        return { ok: false, error: `Invite is ${inv.status}` };
    }
    if (isExpired(inv)) {
        inv.status = "EXPIRED";
        await inv.save();
        return { ok: false, error: "Invite expired" };
    }
    if (inv.targetSessionId && String(inv.targetSessionId) !== args.meSessionId) {
        return { ok: false, error: "Invite is not for this user" };
    }
    if (inv.maxUses && inv.uses >= inv.maxUses) {
        inv.status = "EXPIRED";
        await inv.save();
        return { ok: false, error: "Invite max uses reached" };
    }
    inv.uses += 1;
    inv.acceptedAt = now();
    inv.acceptedBySessionId = oid(args.meSessionId);
    // If maxUses reached, mark accepted; else keep pending for multi-use links
    inv.status = inv.uses >= inv.maxUses ? "ACCEPTED" : "PENDING";
    await inv.save();
    return { ok: true, invite: inv.toObject() };
}
async function revokeInvite(args) {
    const inv = await invite_model_1.InviteModel.findOne({ token: args.token });
    if (!inv)
        return { ok: false, error: "Invite not found" };
    if (String(inv.inviterSessionId) !== args.meSessionId) {
        return { ok: false, error: "Forbidden" };
    }
    if (inv.status !== "PENDING") {
        return { ok: false, error: `Invite is ${inv.status}` };
    }
    inv.status = "REVOKED";
    inv.revokedAt = now();
    await inv.save();
    return { ok: true, invite: inv.toObject() };
}
function toInviteResponse(inv) {
    return {
        id: String(inv._id),
        token: inv.token,
        kind: inv.kind,
        inviterSessionId: String(inv.inviterSessionId),
        targetSessionId: inv.targetSessionId ? String(inv.targetSessionId) : null,
        roomId: inv.roomId ? String(inv.roomId) : null,
        dmThreadId: inv.dmThreadId ? String(inv.dmThreadId) : null,
        status: inv.status,
        maxUses: inv.maxUses,
        uses: inv.uses,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        acceptedBySessionId: inv.acceptedBySessionId
            ? String(inv.acceptedBySessionId)
            : null,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
    };
}
