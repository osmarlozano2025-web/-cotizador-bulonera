import type { ClientFormValues } from "./types";

export type ClientFormFieldName = keyof ClientFormValues;

export class ClientFormError extends Error {
  readonly fieldErrors: Partial<Record<ClientFormFieldName, string>>;

  constructor(message: string, fieldErrors: Partial<Record<ClientFormFieldName, string>> = {}) {
    super(message);
    this.name = "ClientFormError";
    this.fieldErrors = fieldErrors;
  }
}
