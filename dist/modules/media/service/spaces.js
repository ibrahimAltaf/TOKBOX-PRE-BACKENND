"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3 = void 0;
exports.makeObjectKey = makeObjectKey;
exports.publicUrlForKey = publicUrlForKey;
exports.uploadToSpaces = uploadToSpaces;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const env_1 = require("../../../config/env");
function must(v, name) {
    if (!v)
        throw new Error(`${name} is required for Spaces storage`);
    return v;
}
exports.s3 = new client_s3_1.S3Client({
    region: env_1.env.SPACES_REGION,
    endpoint: must(env_1.env.SPACES_ENDPOINT, "SPACES_ENDPOINT"),
    credentials: {
        accessKeyId: must(env_1.env.SPACES_KEY, "SPACES_KEY"),
        secretAccessKey: must(env_1.env.SPACES_SECRET, "SPACES_SECRET"),
    },
});
function makeObjectKey(opts) {
    const ext = path_1.default.extname(opts.originalName || "");
    const rand = crypto_1.default.randomBytes(16).toString("hex");
    const d = new Date();
    const yyyy = String(d.getUTCFullYear());
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${opts.folder}/${yyyy}/${mm}/${dd}/${rand}${ext || ""}`;
}
function publicUrlForKey(key) {
    // Prefer explicit base URL
    if (env_1.env.SPACES_PUBLIC_BASE_URL)
        return `${env_1.env.SPACES_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
    // Default Spaces public URL pattern
    return `https://${env_1.env.SPACES_BUCKET}.${env_1.env.SPACES_REGION}.digitaloceanspaces.com/${key}`;
}
async function uploadToSpaces(args) {
    const bucket = must(env_1.env.SPACES_BUCKET, "SPACES_BUCKET");
    const contentType = args.mimeType ||
        mime_types_1.default.lookup(args.key) ||
        "application/octet-stream";
    const uploader = new lib_storage_1.Upload({
        client: exports.s3,
        params: {
            Bucket: bucket,
            Key: args.key,
            Body: args.buffer,
            ContentType: contentType,
            ACL: "public-read",
            CacheControl: args.cacheControl ?? "public, max-age=31536000, immutable",
        },
    });
    await uploader.done();
    return {
        key: args.key,
        url: publicUrlForKey(args.key),
    };
}
