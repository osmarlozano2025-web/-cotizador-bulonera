-- V007: la cadena de precios queda con tres pasos y nada escondido.
--
--     precio del producto
--       → descuento de familia    (tope en Configuraciones, se carga en el pedido)
--       → descuento del cliente   (Minorista, Mayorista…)
--       → condición de pago       (puede descontar o aumentar)
--     = precio neto
--
-- Se elimina el "descuento de lista" que se había agregado hace un rato: el
-- precio del producto es el que está cargado, sin ningún porcentaje intermedio.

-- Fuera el descuento de lista.
UPDATE configuraciones SET activo = 0
 WHERE clave IN ('descuento_lista_buloneria', 'descuento_lista_tolsen',
                 'descuento_lista_mechas', 'descuento_lista_electrodos');

UPDATE aprobaciones_items SET descBase = 0 WHERE descBase <> 0;

-- La condición de pago pasa a un solo valor con signo, igual que las familias:
--     negativo descuenta   ·   positivo aumenta
-- Los 5% de descuento que tenía "30 días" se convierten en -5.
UPDATE configuraciones SET valor = '{"valor": 0}'
 WHERE clave = 'descuento_contado' AND JSON_EXTRACT(valor, '$.valor') IS NULL;

UPDATE configuraciones SET valor = '{"valor": -5}'
 WHERE clave = 'descuento_30dias' AND JSON_EXTRACT(valor, '$.valor') IS NULL;

UPDATE configuraciones SET valor = '{"valor": 0}'
 WHERE clave = 'descuento_60dias' AND JSON_EXTRACT(valor, '$.valor') IS NULL;

UPDATE configuraciones
   SET descripcion = 'Condición de pago. Negativo descuenta, positivo aumenta.'
 WHERE clave IN ('descuento_contado', 'descuento_30dias', 'descuento_60dias');

-- Un pedido sin cliente ya no se va a poder crear, pero los que existen quedan.
