import { Queue } from "bullmq";
import { env } from "../config/env";

export const connection = { url: env.REDIS_URL };

export const retentionQueue = new Queue("retention", { connection });
export const mediaQueue = new Queue("media", { connection });
export const auditQueue = new Queue("audit", { connection });
