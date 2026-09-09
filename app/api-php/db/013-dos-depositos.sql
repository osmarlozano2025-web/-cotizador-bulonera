-- V010: dos depósitos reales, las cuatro familias se mantienen.
--
-- Pedido del cliente (punto 1.1 del feedback): la operación tiene dos depósitos
-- físicos, no cuatro. Tolsen se despacha aparte; bulonería, mechas y electrodos
-- salen del mismo galpón.
--
-- Familia y depósito pasan a ser cosas distintas:
--   - La FAMILIA es del producto y define su descuento. Siguen siendo cuatro.
--   - El DEPÓSITO es de dónde sale la mercadería. Ahora son dos, y cada uno
--     agrupa una o más familias.
--
-- Por eso el depósito se guarda como una lista con las familias que le tocan,
-- en vez de una fila por familia como estaba antes. Mover electrodos al depósito
-- de Tolsen mañana es editar esta configuración: no hay que migrar ningún dato
-- ni tocar los pedidos ya emitidos.
--
-- Los subpedidos siguen guardándose por familia. La agrupación por depósito se
-- arma al leer, así los 21 subpedidos que ya existen siguen siendo válidos y el
-- cambio es reversible: se vuelve editando la configuración.

DELETE FROM configuraciones WHERE clave IN (
  'deposito_buloneria', 'deposito_tolsen', 'deposito_mechas', 'deposito_electrodos'
);

INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES (
  'depositos',
  '[{"numero":1,"nombre":"Depósito 1 — General","familias":["buloneria","mechas","electrodos"],"responsableId":null},{"numero":2,"nombre":"Depósito 2 — Tolsen","familias":["tolsen"],"responsableId":null}]',
  'Depósitos físicos y qué familias despacha cada uno',
  'deposito'
) ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);
