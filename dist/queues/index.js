"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditQueue = exports.mediaQueue = exports.retentionQueue = exports.connection = void 0;
const bullmq_1 = require("bullmq");
const env_1 = require("../config/env");
exports.connection = { url: env_1.env.REDIS_URL };
exports.retentionQueue = new bullmq_1.Queue("retention", { connection: exports.connection });
exports.mediaQueue = new bullmq_1.Queue("media", { connection: exports.connection });
exports.auditQueue = new bullmq_1.Queue("audit", { connection: exports.connection });
