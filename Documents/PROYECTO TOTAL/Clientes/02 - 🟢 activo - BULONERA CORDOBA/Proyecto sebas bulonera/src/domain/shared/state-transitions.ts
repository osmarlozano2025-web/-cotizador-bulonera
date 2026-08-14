import type { AuthorizationRequestStatus } from "@/domain/approval/approval";
import type { DispatchGuideStatus } from "@/domain/dispatch/dispatch-guide";
import type { NotificationStatus } from "@/domain/notification/notification";
import type { OrderStatus } from "@/domain/order/order";
import type { QuoteStatus } from "@/domain/quote/quote";
import type { TangoSyncJobStatus } from "@/domain/integrations/tango";

export type TransitionMap<TState extends string> = Readonly<Record<TState, readonly TState[]>>;

export const QUOTE_STATUS_TRANSITIONS: TransitionMap<QuoteStatus> = {
  draft: ["pendingApproval", "sent", "cancelled"],
  pendingApproval: ["sent", "rejected", "cancelled"],
  sent: ["accepted", "rejected", "expired", "cancelled"],
  accepted: ["converted", "cancelled"],
  rejected: [],
  expired: [],
  converted: [],
  cancelled: [],
};

export const ORDER_STATUS_TRANSITIONS: TransitionMap<OrderStatus> = {
  draft: ["pendingApproval", "cancelled"],
  pendingApproval: ["approved", "cancelled"],
  approved: ["preparing", "sentToTango", "cancelled"],
  preparing: ["prepared", "cancelled"],
  prepared: ["readyForDispatch", "cancelled"],
  readyForDispatch: ["dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
  delivered: [],
  sentToTango: ["invoiced", "cancelled"],
  invoiced: [],
  cancelled: [],
};

export const AUTHORIZATION_STATUS_TRANSITIONS: TransitionMap<AuthorizationRequestStatus> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: [],
  rejected: [],
  cancelled: [],
};

export const DISPATCH_GUIDE_STATUS_TRANSITIONS: TransitionMap<DispatchGuideStatus> = {
  pending: ["assigned", "cancelled"],
  assigned: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["dispatched", "cancelled"],
  dispatched: ["delivered", "failed", "rescheduled", "cancelled"],
  delivered: [],
  failed: ["rescheduled", "cancelled"],
  rescheduled: ["assigned", "cancelled"],
  cancelled: [],
};

export const TANGO_SYNC_JOB_STATUS_TRANSITIONS: TransitionMap<TangoSyncJobStatus> = {
  pending: ["processing", "cancelled"],
  processing: ["success", "failed", "retrying", "cancelled"],
  success: [],
  failed: ["retrying", "cancelled"],
  retrying: ["processing", "failed", "cancelled"],
  cancelled: [],
  blocked: [],
  notConfigured: [],
};

export const NOTIFICATION_STATUS_TRANSITIONS: TransitionMap<NotificationStatus> = {
  unread: ["read", "archived"],
  read: ["archived"],
  archived: [],
};

export function canTransition<TState extends string>(
  transitions: TransitionMap<TState>,
  from: TState,
  to: TState,
): boolean {
  return transitions[from].includes(to);
}

export function canTransitionQuoteStatus(from: QuoteStatus, to: QuoteStatus): boolean {
  return canTransition(QUOTE_STATUS_TRANSITIONS, from, to);
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return canTransition(ORDER_STATUS_TRANSITIONS, from, to);
}

export function canTransitionAuthorizationStatus(
  from: AuthorizationRequestStatus,
  to: AuthorizationRequestStatus,
): boolean {
  return canTransition(AUTHORIZATION_STATUS_TRANSITIONS, from, to);
}

export function canTransitionDispatchGuideStatus(
  from: DispatchGuideStatus,
  to: DispatchGuideStatus,
): boolean {
  return canTransition(DISPATCH_GUIDE_STATUS_TRANSITIONS, from, to);
}

export function canTransitionTangoSyncJobStatus(
  from: TangoSyncJobStatus,
  to: TangoSyncJobStatus,
): boolean {
  return canTransition(TANGO_SYNC_JOB_STATUS_TRANSITIONS, from, to);
}

export function canTransitionNotificationStatus(
  from: NotificationStatus,
  to: NotificationStatus,
): boolean {
  return canTransition(NOTIFICATION_STATUS_TRANSITIONS, from, to);
}
