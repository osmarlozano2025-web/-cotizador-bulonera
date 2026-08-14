-- V003: familia Electrodos, depósitos con responsable y revisión de stock.
--
-- Esta migración se había aplicado a mano en producción; se escribe acá para
-- que una instalación desde cero llegue al mismo estado. Es idempotente.

-- El panel de Configuraciones guarda también los depósitos, que no estaban
-- entre los tipos previstos en V002.
ALTER TABLE configuraciones
  MODIFY COLUMN tipo ENUM('descuento_familia','descuento_pago','tamaño_caja','deposito','otro') DEFAULT 'otro';

-- Revisión de stock renglón por renglón.
--   pendiente  → todavía no lo miró el depósito
--   confirmado → hay stock
--   sin_stock  → no hay; queda tachado y no suma al total
--   reemplazo  → producto agregado en lugar de uno sin stock
ALTER TABLE aprobaciones_items
  ADD COLUMN IF NOT EXISTS estado             VARCHAR(20)   NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS reemplazaA         BIGINT        NULL,
  ADD COLUMN IF NOT EXISTS nota               VARCHAR(255)  NULL,
  ADD COLUMN IF NOT EXISTS cantidadConfirmada DECIMAL(10,2) NULL;

-- Los 21 electrodos estaban clasificados como bulonería. Las pinzas porta
-- electrodos son herramientas y se quedan en Tolsen.
UPDATE productos
   SET familia = 'electrodos'
 WHERE familia = 'buloneria'
   AND descripcion LIKE '%ELECTRODO%'
   AND descripcion NOT LIKE '%PINZA%';

-- Un depósito por familia, con su responsable.
INSERT INTO configuraciones (clave, valor, descripcion, tipo)
SELECT * FROM (
  SELECT 'deposito_buloneria' clave, '{"numero":1,"familia":"buloneria","nombre":"Depósito 1 — Bulonería","responsableId":null}' valor, 'Depósito 1 — Bulonería' descripcion, 'deposito' tipo
  UNION ALL SELECT 'deposito_tolsen',     '{"numero":2,"familia":"tolsen","nombre":"Depósito 2 — Tolsen","responsableId":null}',         'Depósito 2 — Tolsen',     'deposito'
  UNION ALL SELECT 'deposito_mechas',     '{"numero":3,"familia":"mechas","nombre":"Depósito 3 — Mechas","responsableId":null}',         'Depósito 3 — Mechas',     'deposito'
  UNION ALL SELECT 'deposito_electrodos', '{"numero":4,"familia":"electrodos","nombre":"Depósito 4 — Electrodos","responsableId":null}', 'Depósito 4 — Electrodos', 'deposito'
) nuevos
WHERE NOT EXISTS (SELECT 1 FROM configuraciones c WHERE c.clave = nuevos.clave);
