import type { AuthorizationRequestStatus } from "@/domain/approval/approval";
import type { ClientId } from "@/domain/shared";
import type {
  AccountActionResult,
  AccountAdjustmentInput,
  AccountApprovalResult,
  AccountDetailData,
  AccountEvaluation,
  AccountListQuery,
  AccountListResult,
  AccountMovement,
  AccountOverdueDocument,
  AccountReferenceData,
  AccountSummary,
} from "../types";

export interface AccountRepository {
  getAccounts(query: AccountListQuery): Promise<AccountListResult>;
  getAccountByClientId(clientId: ClientId): Promise<AccountDetailData | null>;
  getAccountMovements(clientId: ClientId): Promise<readonly AccountMovement[]>;
  getAccountSummary(clientId: ClientId): Promise<AccountSummary | null>;
  getOverdueDocuments(clientId?: ClientId): Promise<readonly AccountOverdueDocument[]>;
  evaluateClientCredit(clientId: ClientId): Promise<AccountEvaluation | null>;
  createMockAdjustment(clientId: ClientId, adjustment: AccountAdjustmentInput): Promise<AccountActionResult>;
  requestDebtApproval(clientId: ClientId, reason?: string): Promise<AccountApprovalResult>;
  getReferenceData(): AccountReferenceData;
}

export interface AccountListQueryFilters {
  readonly status?: AccountSummary["accountStatus"] | "all";
  readonly creditCondition?: AccountSummary["creditCondition"] | "all";
  readonly movementType?: AccountMovement["type"] | "all";
  readonly search?: string;
}

export interface AccountApprovalFilter {
  readonly status?: AuthorizationRequestStatus;
}
