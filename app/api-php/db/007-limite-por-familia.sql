-- V006: un solo descuento por familia, que funciona como TOPE del pedido.
--
-- Antes cada familia tenía dos porcentajes encadenados (25+0, 55+18...). Ahora
-- tiene uno solo, entre -50% y +50%, con la convención de siempre:
--     negativo descuenta   ·   positivo aumenta
--
-- Ese valor NO se aplica solo: es el máximo que el vendedor puede cargar en el
-- pedido. En el pedido el campo arranca en 0 y se puede mejorar hasta el tope.

-- Bulonería tenía 25%+0% -> tope -25%
UPDATE configuraciones SET valor = '{"limite": -25}'
 WHERE clave = 'descuento_buloneria' AND JSON_EXTRACT(valor, '$.limite') IS NULL;

-- Tolsen y Mechas tenían 55%+18% = 63,1% efectivo, que no entra en el rango
-- -50/+50. Quedan topeadas en -50%.
UPDATE configuraciones SET valor = '{"limite": -50}'
 WHERE clave = 'descuento_tolsen' AND JSON_EXTRACT(valor, '$.limite') IS NULL;

UPDATE configuraciones SET valor = '{"limite": -50}'
 WHERE clave = 'descuento_mechas' AND JSON_EXTRACT(valor, '$.limite') IS NULL;

-- Electrodos es precio neto: sin descuento.
UPDATE configuraciones SET valor = '{"limite": 0}'
 WHERE clave = 'descuento_electrodos' AND JSON_EXTRACT(valor, '$.limite') IS NULL;

UPDATE configuraciones
   SET descripcion = 'Tope de descuento para la familia. Negativo descuenta, positivo aumenta. En el pedido se arranca en 0 y se puede mejorar hasta acá.'
 WHERE clave IN ('descuento_buloneria', 'descuento_tolsen', 'descuento_mechas', 'descuento_electrodos');

-- El "ajuste base" de V005 deja de tener sentido: el pedido arranca en 0 y el
-- tope lo pone el descuento de la familia. Se desactivan sin borrarlos.
UPDATE configuraciones SET activo = 0
 WHERE clave IN ('ajuste_buloneria', 'ajuste_tolsen', 'ajuste_mechas', 'ajuste_electrodos');

-- El interruptor del motor tampoco aplica al modelo nuevo: ya no hay cadena
-- 55%+18% que encender o apagar. Se desactiva.
UPDATE configuraciones SET activo = 0 WHERE clave = 'motor_descuentos';
