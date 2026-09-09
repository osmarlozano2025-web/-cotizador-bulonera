-- V011: descuentos por cliente y grupo de productos.
--
-- La base de clientes real trae SEIS descuentos por cliente, no uno:
--     BUL G · BUL F · TOR G · TOR F · VAR · TOL
-- es decir, un porcentaje por grupo de productos, y en bulonería y
-- tornillería además distinto según se venda por granel o por fracción.
--
-- Hasta acá `clientes.descuento` guardaba un único número (el tipo A/B/C/D).
-- Esa columna se conserva para no romper nada: el motor de precios la sigue
-- usando hasta que se lo conecte a los descuentos por grupo.

-- --------------------------------------------------------------- clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS codigoCliente   VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS vendedor        VARCHAR(60)  NULL,
  ADD COLUMN IF NOT EXISTS zona            VARCHAR(80)  NULL,
  ADD COLUMN IF NOT EXISTS domicilio       VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS descBulGranel   DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descBulFraccion DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descTorGranel   DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descTorFraccion DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descVar         DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descTol         DECIMAL(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes (codigoCliente);

-- -------------------------------------------------------------- productos
-- A qué grupo de descuento pertenece cada producto:
--     bul  bulones, tuercas, tirafondos       (índices A, B, D)
--     tor  tornillos y autoperforantes        (índices E, F, G)
--     var  varillas, arandelas, anclajes, cables (índices H, I, K, L y sin índice)
--     tol  Tolsen y mechas Pantthor           (misma escala 55/60)
--     neto electrodos, que la lista marca como precio neto
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS grupoDescuento VARCHAR(10) NOT NULL DEFAULT 'var';

CREATE INDEX IF NOT EXISTS idx_productos_grupo ON productos (grupoDescuento);

UPDATE productos SET grupoDescuento = 'bul'
 WHERE familia = 'buloneria' AND LEFT(subfamilia, 1) IN ('A', 'B', 'D');

UPDATE productos SET grupoDescuento = 'tor'
 WHERE familia = 'buloneria' AND LEFT(subfamilia, 1) IN ('E', 'F', 'G');

UPDATE productos SET grupoDescuento = 'var'
 WHERE familia = 'buloneria'
   AND (subfamilia IS NULL OR subfamilia = '' OR LEFT(subfamilia, 1) IN ('H', 'I', 'K', 'L'));

-- Tolsen y las mechas Pantthor comparten la escala de descuento (55 / 60),
-- según los encabezados de sus propias listas de precios.
UPDATE productos SET grupoDescuento = 'tol' WHERE familia IN ('tolsen', 'mechas');

-- La lista de electrodos dice "DESCUENTO 0 — Neto": no lleva descuento de cliente.
UPDATE productos SET grupoDescuento = 'neto' WHERE familia = 'electrodos';
