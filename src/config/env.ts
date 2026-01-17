import "dotenv/config";

const num = (v: any, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: num(process.env.PORT, 8080),

  // ✅ Never hardcode secrets here; keep empty fallback so you notice missing env in prod
  MONGO_URI: process.env.MONGO_URI ?? "mongodb+srv://tokbox:Developer0312@cluster0.kxsywkn.mongodb.net/?appName=Cluster0",

  // ✅ Set this in Render: redis://... OR rediss://...
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "bc_session",
  SESSION_TTL_DAYS: num(process.env.SESSION_TTL_DAYS, 7),

  // uploads
  PUBLIC_UPLOAD_BASE: process.env.PUBLIC_UPLOAD_BASE ?? "/uploads",
  UPLOAD_ROOT: process.env.UPLOAD_ROOT ?? "",

  STORAGE_DRIVER: process.env.STORAGE_DRIVER ?? "local", // "spaces" | "local"

  SPACES_ENDPOINT: process.env.SPACES_ENDPOINT ?? "",
  SPACES_REGION: process.env.SPACES_REGION ?? "nyc3",
  SPACES_BUCKET: process.env.SPACES_BUCKET ?? "",
  SPACES_KEY: process.env.SPACES_KEY ?? "",
  SPACES_SECRET: process.env.SPACES_SECRET ?? "",
  SPACES_PUBLIC_BASE_URL: process.env.SPACES_PUBLIC_BASE_URL ?? "",
};
