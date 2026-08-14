export type EntityId = string;
export type ISODateString = string;

export interface TenantContext {
  companyId: EntityId;
  branchId: EntityId;
}
