import type { TangoOperation, TangoSyncJobQueueItem, TangoSyncJobStatus } from "../types";

export function createIdempotencyKey(companyId: string, operation: TangoOperation, entityId: string, version = "v1"): string {
  return [companyId, operation, entityId, version].join(":");
}

export function isDuplicateJob(jobs: readonly TangoSyncJobQueueItem[], key: string): boolean {
  return jobs.some((job) => job.idempotencyKey === key && job.status !== "failed" && job.status !== "cancelled");
}

export function canRetryJob(status: TangoSyncJobStatus): boolean {
  return status === "failed" || status === "retrying";
}
