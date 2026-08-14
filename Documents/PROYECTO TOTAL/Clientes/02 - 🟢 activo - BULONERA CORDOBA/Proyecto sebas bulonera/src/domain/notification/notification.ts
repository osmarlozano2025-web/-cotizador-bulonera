import type { CompanyId, NotificationId, UserId } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type NotificationStatus = "unread" | "read" | "archived";
export type NotificationType = string;

export interface Notification {
  readonly id: NotificationId;
  readonly companyId: CompanyId;
  readonly userId: UserId;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly status: NotificationStatus;
  readonly relatedEntityType?: string;
  readonly relatedEntityId?: string;
  readonly createdAt: ISODateString;
  readonly readAt?: ISODateString;
}
