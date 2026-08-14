import type { AuthorizationRequestId, SellerId } from "@/domain/shared";
import { MockApprovalRepository } from "../repositories/mock-approval-repository";
import { getApprovalReferenceData, getApprovalSeedList } from "../data/mock-approvals";
import type { ApprovalActionResult, ApprovalCreateInput, ApprovalReferenceData } from "../types";
import { notifyApprovalChange, type ApprovalChangeEvent } from "../utils/approval-events";

const repository = new MockApprovalRepository();

export function getApprovalReferenceDataService(): ApprovalReferenceData {
  return getApprovalReferenceData();
}

export const getApprovals = repository.getApprovals.bind(repository);
export const getApprovalById = repository.getApprovalById.bind(repository);
export const getApprovalDetailData = repository.getApprovalDetailData.bind(repository);
export const getApprovalLookup = repository.getApprovalLookup.bind(repository);
export const getApprovalByClientId = repository.getApprovalByClientId.bind(repository);

export async function createApproval(input: ApprovalCreateInput): Promise<ApprovalActionResult> {
  const result = await repository.createApproval(input);
  notifyApprovalChange(toChangeEvent(result));
  return result;
}

export async function approveApproval(approvalId: AuthorizationRequestId, approverSellerId?: SellerId): Promise<ApprovalActionResult> {
  const result = await repository.approveApproval(approvalId, approverSellerId);
  notifyApprovalChange(toChangeEvent(result));
  return result;
}

export async function rejectApproval(approvalId: AuthorizationRequestId, approverSellerId?: SellerId): Promise<ApprovalActionResult> {
  const result = await repository.rejectApproval(approvalId, approverSellerId);
  notifyApprovalChange(toChangeEvent(result));
  return result;
}

export async function cancelApproval(approvalId: AuthorizationRequestId): Promise<ApprovalActionResult> {
  const result = await repository.cancelApproval(approvalId);
  notifyApprovalChange(toChangeEvent(result));
  return result;
}

export async function addApprovalObservation(approvalId: AuthorizationRequestId, note: string): Promise<ApprovalActionResult> {
  const result = await repository.addObservation(approvalId, note);
  notifyApprovalChange(toChangeEvent(result));
  return result;
}

export const getApprovalByQuoteId = repository.getApprovalByQuoteId.bind(repository);
export const getApprovalByOrderId = repository.getApprovalByOrderId.bind(repository);

export function getApprovalSeedSnapshot() {
  return getApprovalSeedList();
}

function toChangeEvent(result: ApprovalActionResult): ApprovalChangeEvent {
  return {
    approvalId: result.request.id,
    status: result.request.status,
    ...(result.request.clientId !== undefined ? { clientId: result.request.clientId } : {}),
    ...(result.request.quoteId !== undefined ? { quoteId: result.request.quoteId } : {}),
    ...(result.request.orderId !== undefined ? { orderId: result.request.orderId } : {}),
  };
}
