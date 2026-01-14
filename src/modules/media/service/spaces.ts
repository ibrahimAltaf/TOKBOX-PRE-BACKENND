import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import crypto from "crypto";
import path from "path";
import mime from "mime-types";
import { env } from "../../../config/env";

function must(v: string, name: string) {
  if (!v) throw new Error(`${name} is required for Spaces storage`);
  return v;
}

export const s3 = new S3Client({
  region: env.SPACES_REGION,
  endpoint: must(env.SPACES_ENDPOINT, "SPACES_ENDPOINT"),
  credentials: {
    accessKeyId: must(env.SPACES_KEY, "SPACES_KEY"),
    secretAccessKey: must(env.SPACES_SECRET, "SPACES_SECRET"),
  },
});

export function makeObjectKey(opts: { folder: string; originalName: string }) {
  const ext = path.extname(opts.originalName || "");
  const rand = crypto.randomBytes(16).toString("hex");
  const d = new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${opts.folder}/${yyyy}/${mm}/${dd}/${rand}${ext || ""}`;
}

export function publicUrlForKey(key: string) {
  // Prefer explicit base URL
  if (env.SPACES_PUBLIC_BASE_URL)
    return `${env.SPACES_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  // Default Spaces public URL pattern
  return `https://${env.SPACES_BUCKET}.${env.SPACES_REGION}.digitaloceanspaces.com/${key}`;
}

export async function uploadToSpaces(args: {
  buffer: Buffer;
  mimeType: string;
  key: string;
  cacheControl?: string;
}) {
  const bucket = must(env.SPACES_BUCKET, "SPACES_BUCKET");

  const contentType =
    args.mimeType ||
    (mime.lookup(args.key) as string) ||
    "application/octet-stream";

  const uploader = new Upload({
    client: s3,
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
