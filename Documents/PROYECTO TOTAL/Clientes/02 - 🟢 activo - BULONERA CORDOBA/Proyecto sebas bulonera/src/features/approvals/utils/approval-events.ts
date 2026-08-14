import type { AuthorizationRequestId, ClientId, OrderId, QuoteId } from "@/domain/shared";
import type { AuthorizationRequestStatus } from "@/domain/approval/approval";

export interface ApprovalChangeEvent {
  readonly approvalId: AuthorizationRequestId;
  readonly status: AuthorizationRequestStatus;
  readonly clientId?: ClientId;
  readonly quoteId?: QuoteId;
  readonly orderId?: OrderId;
}

const listeners = new Set<(event: ApprovalChangeEvent) => void>();

export function notifyApprovalChange(event: ApprovalChangeEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeApprovalChanges(listener: (event: ApprovalChangeEvent) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
