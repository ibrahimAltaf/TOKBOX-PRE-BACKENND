import { Worker } from "bullmq";
import { connection } from "../queues";

export const retentionWorker = new Worker(
  "retention",
  async (job) => {
    // later: implement DB cleanup logic
    // job.name like "cleanup-messages", "cleanup-media"
    return { ok: true };
  },
  { connection }
);

retentionWorker.on("completed", (job) =>
  console.log("[retention] done", job.id)
);
retentionWorker.on("failed", (job, err) =>
  console.error("[retention] failed", job?.id, err)
);
