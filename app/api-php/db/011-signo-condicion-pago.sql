-- V008: corrige el signo de la condición de pago en los pedidos viejos.
--
-- Hasta V006, en `descPago1` un número positivo DESCONTABA. Desde V007 la
-- convención es la misma que la de las familias: negativo descuenta, positivo
-- aumenta. Los pedidos emitidos antes quedaron con el signo al revés.
--
-- El precio guardado en `precioNeto` es correcto y NO se toca: lo único que
-- estaba mal era el porcentaje que se muestra en la proforma, que decía
-- "+5% de recargo" donde en realidad se había hecho un 5% de descuento.
--
-- Se verificó renglón por renglón antes de escribir esto: los 22 renglones
-- con condición de pago distinta de cero encajan con la convención vieja y
-- ninguno con la nueva, así que la conversión no es ambigua.

UPDATE aprobaciones_items
   SET descPago1 = -descPago1
 WHERE descPago1 > 0
   AND precioGranel > 0
   AND ABS(
         ROUND(
           precioGranel
             * (1 + descAjusteFamilia / 100)
             * (1 - ABS(descCliente) / 100)
             * (1 - descPago1 / 100),
           2
         ) - precioNeto
       ) < 0.02;
