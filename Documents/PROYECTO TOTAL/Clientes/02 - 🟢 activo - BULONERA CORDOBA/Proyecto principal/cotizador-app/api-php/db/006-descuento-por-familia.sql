-- V005: descuento editable por familia dentro del pedido.
--
-- Convención de signo en TODA esta funcionalidad:
--     negativo = descuento   (-15 baja el precio 15%)
--     positivo = aumento     (+30 lo sube 30%)
--
-- Migración aditiva. El valor por defecto es 0, así que hasta que alguien
-- cargue un ajuste no cambia ningún precio.

-- Cada grupo de familia del pedido guarda su propio ajuste.
ALTER TABLE aprobaciones_subpedidos
  ADD COLUMN IF NOT EXISTS descuentoFamilia DECIMAL(5,2) NOT NULL DEFAULT 0;

-- El ajuste que se aplicó a cada renglón, para poder mostrar el desglose
-- aunque después cambien los valores de configuración.
ALTER TABLE aprobaciones_items
  ADD COLUMN IF NOT EXISTS descAjusteFamilia DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Rango permitido, editable desde Configuraciones.
INSERT INTO configuraciones (clave, valor, descripcion, tipo)
SELECT 'rango_descuento',
       '{"min": -50, "max": 50}',
       'Rango permitido para el ajuste por familia. Negativo descuenta, positivo aumenta.',
       'otro'
 WHERE NOT EXISTS (SELECT 1 FROM configuraciones WHERE clave = 'rango_descuento');

-- Ajuste base por familia: es lo que se precarga al armar un pedido.
-- Arranca en 0 para no mover ningún precio.
INSERT INTO configuraciones (clave, valor, descripcion, tipo)
SELECT * FROM (
  SELECT 'ajuste_buloneria'  clave, '{"valor": 0}' valor, 'Ajuste base Bulonería (negativo descuenta)'  descripcion, 'descuento_familia' tipo
  UNION ALL SELECT 'ajuste_tolsen',     '{"valor": 0}', 'Ajuste base Tolsen (negativo descuenta)',     'descuento_familia'
  UNION ALL SELECT 'ajuste_mechas',     '{"valor": 0}', 'Ajuste base Mechas (negativo descuenta)',     'descuento_familia'
  UNION ALL SELECT 'ajuste_electrodos', '{"valor": 0}', 'Ajuste base Electrodos (negativo descuenta)', 'descuento_familia'
) nuevos
WHERE NOT EXISTS (SELECT 1 FROM configuraciones c WHERE c.clave = nuevos.clave);
