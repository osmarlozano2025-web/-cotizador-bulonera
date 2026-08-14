import type { ClientFormValues } from "../types";

export const CLIENT_PAYMENT_CONDITION_OPTIONS = [
  "Contado",
  "15 días",
  "30 días",
  "45 días",
  "Cuenta corriente",
  "Anticipado",
] as const;

const VALID_TAX_ID_PREFIXES = new Set(["20", "23", "24", "27", "30", "33", "34"]);
const TAX_ID_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

export function normalizeTaxId(value: string): string {
  return value.replace(/[\s-]/g, "").trim();
}

export function formatTaxId(value: string): string {
  const digits = normalizeTaxId(value);
  if (digits.length !== 11) {
    return value.trim();
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function isValidArgentineTaxId(value: string): boolean {
  const digits = normalizeTaxId(value);
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  if (!VALID_TAX_ID_PREFIXES.has(digits.slice(0, 2))) {
    return false;
  }

  const baseDigits = digits.slice(0, 10).split("").map((digit) => Number(digit));
  const checksum = baseDigits.reduce((sum, digit, index) => sum + digit * TAX_ID_WEIGHTS[index]!, 0);
  const verification = 11 - (checksum % 11);
  const expectedDigit = verification === 11 ? 0 : verification === 10 ? 9 : verification;
  return expectedDigit === Number(digits[10]);
}

export function isValidPhoneNumber(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return true;
  }

  if (!/^[0-9+\-()\s]+$/.test(normalized)) {
    return false;
  }

  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function hasPartialAddress(values: Pick<ClientFormValues, "street" | "streetNumber" | "city" | "province" | "postalCode" | "country" | "references">): boolean {
  return [
    values.street,
    values.streetNumber,
    values.city,
    values.province,
    values.postalCode,
    values.country,
    values.references,
  ].some((value) => value.trim().length > 0);
}
