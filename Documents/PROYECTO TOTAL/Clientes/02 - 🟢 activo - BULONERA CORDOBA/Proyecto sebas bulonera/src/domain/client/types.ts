export type ClientAddressType = "billing" | "shipping" | "commercial";
export type ClientStatus = "active" | "inactive" | "blocked" | "suspended" | "pendingApproval";
export type AccountStatus = "current" | "overdue" | "exceededCreditLimit" | "blocked" | "underReview";
export type ClientCommercialStatus = "active" | "inactive" | "blocked" | "suspended" | "pendingApproval" | "underReview";
export type CreditCondition = "normal" | "review" | "restricted" | "blocked";
