import { MockAccountRepository, getAccountReferenceDataService } from "../repositories/mock-account-repository";
import type { AccountReferenceData } from "../types";

const repository = new MockAccountRepository();

export function getAccountReferenceData(): AccountReferenceData {
  return getAccountReferenceDataService();
}

export const getAccounts = repository.getAccounts.bind(repository);
export const getAccountByClientId = repository.getAccountByClientId.bind(repository);
export const getAccountMovements = repository.getAccountMovements.bind(repository);
export const getAccountSummary = repository.getAccountSummary.bind(repository);
export const getOverdueDocuments = repository.getOverdueDocuments.bind(repository);
export const evaluateClientCredit = repository.evaluateClientCredit.bind(repository);
export const createMockAdjustment = repository.createMockAdjustment.bind(repository);
export const requestDebtApproval = repository.requestDebtApproval.bind(repository);
