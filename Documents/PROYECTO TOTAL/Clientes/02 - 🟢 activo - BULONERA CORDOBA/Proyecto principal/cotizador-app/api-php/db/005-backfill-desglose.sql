-- V004 (continuación): completa el desglose de los pedidos que ya existían.
--
-- La 004 dejó precioNeto = precioGranel, pero el total de esos pedidos se
-- calculaba aplicando además el descuento del cliente a nivel pedido. Como a
-- partir de ahora el total sale de sumar precioNeto, hay que bajar ese
-- descuento al renglón o los pedidos viejos se encarecerían.

UPDATE aprobaciones_items i
  JOIN aprobaciones_subpedidos s ON s.id = i.subpedidoId
  JOIN aprobaciones a           ON a.id = s.aprobacionId
   SET i.descCliente = a.descuento,
       i.precioNeto  = ROUND(i.precioGranel * (1 - a.descuento / 100), 2)
 WHERE i.descCliente = 0
   AND a.descuento > 0;

-- Subtotal a precio de lista, para poder mostrar el ahorro en la proforma.
UPDATE aprobaciones a
   SET a.subtotalLista = COALESCE((
         SELECT ROUND(SUM(i.cantidad * i.precioLista), 2)
           FROM aprobaciones_items i
           JOIN aprobaciones_subpedidos s ON s.id = i.subpedidoId
          WHERE s.aprobacionId = a.id
       ), 0)
 WHERE a.subtotalLista = 0;
