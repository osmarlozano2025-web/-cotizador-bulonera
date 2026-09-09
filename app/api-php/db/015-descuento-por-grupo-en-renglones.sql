-- V011: cada renglón guarda con qué grupo y en qué modo se lo cotizó.
--
-- El descuento del cliente ya no es uno solo: depende del grupo del producto
-- (bul / tor / var / tol / neto) y, en bulonería y tornillería, de si se vende
-- por granel o por fracción. Guardarlo en el renglón deja el pedido explicado
-- por sí mismo aunque después cambien los porcentajes del cliente.

ALTER TABLE aprobaciones_items
  ADD COLUMN IF NOT EXISTS grupoDescuento VARCHAR(10) NOT NULL DEFAULT 'var',
  ADD COLUMN IF NOT EXISTS modoVenta      VARCHAR(10) NOT NULL DEFAULT 'granel';

-- Los renglones que ya existen se completan desde el producto, cuando todavía
-- se lo puede encontrar por código.
UPDATE aprobaciones_items i
  JOIN productos p ON p.codigo = i.codigo
   SET i.grupoDescuento = p.grupoDescuento
 WHERE i.grupoDescuento = 'var';
