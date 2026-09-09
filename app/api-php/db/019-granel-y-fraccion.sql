-- Granel y fracción en el renglón del pedido.
--
-- El precio de partida es el de lista. El sistema no descuenta por llegar al
-- bulto: dice en qué modo quedó el renglón y cuántos bultos son, y el descuento
-- lo carga a mano quien arma el pedido.
--
-- Los bultos y las unidades se guardan con el renglón y no se recalculan al
-- mostrar: si mañana cambia el bulto del producto, el pedido viejo tiene que
-- seguir diciendo lo que se cotizó ese día.
--
-- Va un ALTER por columna a propósito. Agrupadas en una sola sentencia, que una
-- ya exista tira abajo el resto: `modoVenta` y `descuentoItem` venían de las
-- migraciones 015 y 016, y arrastraron con ellas a las que sí faltaban.

ALTER TABLE aprobaciones_items ADD COLUMN modoVenta     VARCHAR(10)   NOT NULL DEFAULT 'unidad' AFTER cantidad;
ALTER TABLE aprobaciones_items ADD COLUMN bultos        INT           NOT NULL DEFAULT 0;
ALTER TABLE aprobaciones_items ADD COLUMN unidadGranel  DECIMAL(12,2) NULL;
ALTER TABLE aprobaciones_items ADD COLUMN unidadFraccion DECIMAL(12,2) NULL;
ALTER TABLE aprobaciones_items ADD COLUMN descuentoItem DECIMAL(6,2)  NOT NULL DEFAULT 0;
