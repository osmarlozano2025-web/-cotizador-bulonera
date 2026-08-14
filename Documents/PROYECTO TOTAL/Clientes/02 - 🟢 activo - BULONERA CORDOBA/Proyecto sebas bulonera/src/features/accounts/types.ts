import type { AuthorizationRequest, AuthorizationRequestStatus, AuthorizationRequestType } from "@/domain/approval/approval";
import type { ClientDebt, ClientFinancialSnapshot } from "@/domain/client/client";
import type { AccountStatus, CreditCondition } from "@/domain/client/types";
import type { Client } from "@/domain/client/client";
import type { BranchId, ClientId, CompanyId, OrderId } from "@/domain/shared";
import type { ISODateString } from "@/types/identity";

export type AccountDateRangeFilter = "all" | "currentMonth" | "last30Days" | "last90Days";
export type AccountMovementType = "invoice" | "payment" | "creditNote" | "debitNote" | "adjustment";
export type AccountMovementStatus = "pending" | "partiallyPaid" | "paid" | "overdue" | "cancelled" | "applied";
export type AccountState = AccountStatus | "creditBalance";

export interface AccountListFilters {
  readonly search: string;
  readonly status: AccountState | "all";
  readonly creditCondition: CreditCondition | "all";
  readonly movementType: AccountMovementType | "all";
  readonly dateRange: AccountDateRangeFilter;
}

export const DEFAULT_ACCOUNT_LIST_FILTERS: AccountListFilters = {
  search: "",
  status: "all",
  creditCondition: "all",
  movementType: "all",
  dateRange: "all",
} as const;

export const ACCOUNTS_PAGE_SIZE = 8;

export interface AccountMovement {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly branchId: BranchId;
  readonly clientId: ClientId;
  readonly type: AccountMovementType;
  readonly documentNumber: string;
  readonly description: string;
  readonly issueDate: ISODateString;
  readonly dueDate?: ISODateString;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly balanceAfter: number;
  readonly currency: string;
  readonly status: AccountMovementStatus;
  readonly relatedOrderId?: OrderId;
  readonly relatedInvoiceId?: string;
  readonly createdAt: ISODateString;
}

export interface AccountOverdueDocument {
  readonly id: string;
  readonly clientId: ClientId;
  readonly documentNumber: string;
  readonly description: string;
  readonly dueDate: ISODateString;
  readonly amount: number;
  readonly overdueAmount: number;
  readonly daysPastDue: number;
  readonly currency: string;
  readonly status: AccountMovementStatus;
  readonly relatedMovementId: string;
  readonly relatedOrderId?: OrderId;
  readonly relatedInvoiceId?: string;
}

export interface AccountEvaluation {
  readonly canOperate: boolean;
  readonly label: string;
  readonly recommendation: string;
  readonly reasons: readonly string[];
  readonly riskLevel: "low" | "medium" | "high";
}

export interface AccountSummary {
  readonly clientId: ClientId;
  readonly clientCode: string;
  readonly clientName: string;
  readonly tradeName?: string;
  readonly assignedSellerName?: string;
  readonly creditCondition: CreditCondition;
  readonly accountStatus: AccountState;
  readonly debtSnapshot: ClientDebt;
  readonly financialSnapshot: ClientFinancialSnapshot;
  readonly currentBalance: number;
  readonly creditAvailable: number;
  readonly daysPastDue: number;
  readonly movementsCount: number;
  readonly overdueDocumentsCount: number;
  readonly lastMovementAt: ISODateString;
  readonly lastUpdatedAt: ISODateString;
  readonly needsAuthorization: boolean;
  readonly hasPendingApproval: boolean;
  readonly blocked: boolean;
  readonly canOperate: boolean;
  readonly approvalStatus?: AuthorizationRequestStatus;
  readonly approvalType?: AuthorizationRequestType;
  readonly approvalNumber?: string;
  readonly approvalRequest?: AuthorizationRequest;
}

export interface AccountDetailData extends AccountSummary {
  readonly client: Client;
  readonly movements: readonly AccountMovement[];
  readonly overdueDocuments: readonly AccountOverdueDocument[];
  readonly evaluation: AccountEvaluation;
}

export interface AccountListQuery {
  readonly filters: AccountListFilters;
  readonly page: number;
  readonly pageSize: number;
}

export interface AccountListResult {
  readonly items: readonly AccountSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface AccountReferenceData {
  readonly statusOptions: readonly { id: AccountState | "all"; label: string }[];
  readonly creditConditionOptions: readonly { id: CreditCondition | "all"; label: string }[];
  readonly movementTypeOptions: readonly { id: AccountMovementType | "all"; label: string }[];
  readonly movementStatusOptions: readonly { id: AccountMovementStatus; label: string }[];
}

export interface AccountAdjustmentInput {
  readonly amount: number;
  readonly description: string;
  readonly type: "debit" | "credit";
  readonly reference?: string;
}

export interface AccountActionResult {
  readonly clientId: ClientId;
  readonly movement: AccountMovement;
  readonly detail: AccountDetailData;
}

export interface AccountApprovalResult {
  readonly clientId: ClientId;
  readonly request: AuthorizationRequest;
  readonly detail: AccountDetailData;
}
