import type { ExternalClientPayload, ExternalOrderPayload, ExternalOrderItemPayload, ExternalProductPayload } from "../types";

export function validateExternalProductPayload(payload: ExternalProductPayload): readonly string[] {
  const errors: string[] = [];
  if (payload.code.trim().length === 0) errors.push("El código del producto es obligatorio.");
  if (payload.price < 0) errors.push("El precio del producto no puede ser negativo.");
  if (payload.stock < 0) errors.push("El stock no puede ser negativo.");
  return errors;
}

export function validateExternalClientPayload(payload: ExternalClientPayload): readonly string[] {
  const errors: string[] = [];
  if (payload.code.trim().length === 0) errors.push("El código del cliente es obligatorio.");
  if (payload.taxId.trim().length === 0) errors.push("El CUIT del cliente es obligatorio.");
  return errors;
}

export function validateExternalOrderItemPayload(payload: ExternalOrderItemPayload): readonly string[] {
  const errors: string[] = [];
  if (payload.quantity <= 0) errors.push("La cantidad debe ser mayor que cero.");
  if (payload.unitPrice < 0) errors.push("El precio unitario no puede ser negativo.");
  return errors;
}

export function validateExternalOrderPayload(payload: ExternalOrderPayload): readonly string[] {
  const errors: string[] = [];
  if (payload.items.length === 0) errors.push("El pedido debe tener ítems.");
  if (payload.total < 0) errors.push("El total no puede ser negativo.");
  for (const item of payload.items) {
    errors.push(...validateExternalOrderItemPayload(item));
  }
  return errors;
}
