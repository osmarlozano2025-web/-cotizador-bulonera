import type { EntityId, ISODateString } from "@/types/identity";

export type Currency = string;
export type Percentage = number;

export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

export interface DateRange {
  readonly from: ISODateString;
  readonly to?: ISODateString;
}

export interface Address {
  readonly street: string;
  readonly number?: string;
  readonly floor?: string;
  readonly apartment?: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode?: string;
  readonly country: string;
  readonly reference?: string;
}

export interface AuditFields {
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly createdBy?: EntityId;
  readonly updatedBy?: EntityId;
}

export type EntityStatus = "active" | "inactive" | "pending" | "blocked" | "suspended" | "archived";

export type SafeJsonPrimitive = string | number | boolean | null;
export type SafeJsonValue = SafeJsonPrimitive | SafeJsonObject | readonly SafeJsonValue[];

export interface SafeJsonObject {
  readonly [key: string]: SafeJsonValue;
}
