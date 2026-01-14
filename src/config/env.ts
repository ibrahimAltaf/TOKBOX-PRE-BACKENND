import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 8080),

  MONGO_URI:
    process.env.MONGO_URI ?? "mongodb://localhost:27017/bullchat_clone",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "bc_session",
  SESSION_TTL_DAYS: Number(process.env.SESSION_TTL_DAYS ?? 7),

  STORAGE_DRIVER: process.env.STORAGE_DRIVER ?? "spaces", // "spaces" | "local"

  SPACES_ENDPOINT: process.env.SPACES_ENDPOINT ?? "",
  SPACES_REGION: process.env.SPACES_REGION ?? "nyc3",
  SPACES_BUCKET: process.env.SPACES_BUCKET ?? "",
  SPACES_KEY: process.env.SPACES_KEY ?? "",
  SPACES_SECRET: process.env.SPACES_SECRET ?? "",
  SPACES_PUBLIC_BASE_URL: process.env.SPACES_PUBLIC_BASE_URL ?? "",
};
