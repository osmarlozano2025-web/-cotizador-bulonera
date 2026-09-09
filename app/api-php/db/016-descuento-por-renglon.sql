-- V012: descuento propio de cada renglón, y modo de venta deducido.
--
-- El modo (granel / fracción / unidad) ya no lo elige el vendedor: sale de
-- comparar la cantidad pedida contra los bultos del producto. Si la cantidad
-- llega al bulto de granel es granel; si llega al de fracción es fracción; si
-- no, se vende por unidad.
--
-- Y cuando el renglón es granel o fracción se le puede cargar un descuento
-- propio, además del de la familia.

ALTER TABLE aprobaciones_items
  ADD COLUMN IF NOT EXISTS descuentoItem DECIMAL(5,2) NOT NULL DEFAULT 0;
