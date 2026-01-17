"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retentionWorker = void 0;
const bullmq_1 = require("bullmq");
const queues_1 = require("../queues");
exports.retentionWorker = new bullmq_1.Worker("retention", async (job) => {
    // later: implement DB cleanup logic
    // job.name like "cleanup-messages", "cleanup-media"
    return { ok: true };
}, { connection: queues_1.connection });
exports.retentionWorker.on("completed", (job) => console.log("[retention] done", job.id));
exports.retentionWorker.on("failed", (job, err) => console.error("[retention] failed", job?.id, err));
