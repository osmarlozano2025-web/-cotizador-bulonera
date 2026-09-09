-- V004: motor de descuentos, trazabilidad y pedido directo.
-- Migración ADITIVA: sólo agrega columnas/tablas con DEFAULT. No borra ni
-- reescribe datos existentes, así que se puede correr sobre producción y
-- volver atrás sin perder nada.

-- ---------------------------------------------------------------- pedidos
-- condicionPago: define qué descuento por pago se aplica.
-- tipoOrigen: 'cotizacion' pasa por confirmación del cliente, 'directo' no.
ALTER TABLE aprobaciones
  ADD COLUMN IF NOT EXISTS condicionPago VARCHAR(20) NOT NULL DEFAULT 'contado',
  ADD COLUMN IF NOT EXISTS tipoOrigen VARCHAR(20) NOT NULL DEFAULT 'cotizacion',
  ADD COLUMN IF NOT EXISTS subtotalLista DECIMAL(14,2) NOT NULL DEFAULT 0;

-- ------------------------------------------------------------------ ítems
-- Desglose congelado al momento de crear el pedido: si mañana cambian los
-- porcentajes en Configuraciones, los pedidos viejos siguen mostrando lo suyo.
ALTER TABLE aprobaciones_items
  ADD COLUMN IF NOT EXISTS precioLista   DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descFamilia1  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descFamilia2  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descPago1     DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descPago2     DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descCliente   DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precioNeto    DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Los pedidos que ya existen no tienen desglose. Los dejamos coherentes:
-- el neto es lo que ya se les cobró (precioGranel) y el lista, lo mismo.
UPDATE aprobaciones_items
   SET precioNeto = precioGranel
 WHERE precioNeto = 0 AND precioGranel > 0;

UPDATE aprobaciones_items
   SET precioLista = precioGranel
 WHERE precioLista = 0 AND precioGranel > 0;

-- --------------------------------------------------------- log de estados
-- Quién cambió qué y cuándo. Requisito 11 y 12 del análisis.
CREATE TABLE IF NOT EXISTS pedidos_log (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  aprobacionId   VARCHAR(30) NOT NULL,
  evento         VARCHAR(40) NOT NULL,
  estadoAnterior VARCHAR(30),
  estadoNuevo    VARCHAR(30),
  itemId         BIGINT,
  usuarioId      VARCHAR(30),
  usuarioNombre  VARCHAR(150),
  detalle        VARCHAR(500),
  fecha          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_aprobacion (aprobacionId),
  INDEX idx_log_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------- clientes
-- Condición de pago habitual del cliente, se propone al armar el pedido.
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS condicionPago VARCHAR(20) NOT NULL DEFAULT 'contado';

-- ---------------------------------------------------------- configuración
-- El interruptor del motor. Arranca APAGADO a propósito: los precioGranel de
-- la tabla productos ya tienen descuentos aplicados que no coinciden con los
-- porcentajes configurados (Bulonería 50%, Mechas 70,11%, Tolsen 0%), así que
-- encenderlo cambia todos los precios y es una decisión comercial, no técnica.
INSERT INTO configuraciones (clave, valor, descripcion, tipo)
SELECT 'motor_descuentos',
       '{"activo": false, "base": "lista"}',
       'Motor de descuentos por familia y condición de pago. activo=false mantiene el cálculo histórico (precioGranel - descuento del cliente). base=lista aplica la cadena sobre precioLista.',
       'otro'
 WHERE NOT EXISTS (SELECT 1 FROM configuraciones WHERE clave = 'motor_descuentos');
