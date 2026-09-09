-- V009: cantidad de bultos del envío.
--
-- Pedido del cliente (punto 2.2 del feedback): al cerrar el pedido hay que
-- registrar en cuántos bultos se despacha, para que el remito y la logística
-- sepan qué esperar.
--
-- Va en `aprobaciones` y no en los subpedidos porque el bulto es del envío
-- completo al cliente, no de cada depósito por separado. Si más adelante se
-- despacha por depósito, se agrega la columna equivalente en subpedidos.
--
-- NULL significa "todavía no se contó", que es distinto de 0 ("no se despachó
-- nada"). Por eso no lleva DEFAULT 0.

ALTER TABLE aprobaciones
  ADD COLUMN bultos INT NULL AFTER estado;
