-- V007: hacer visible el descuento que ya viene metido en el precio de granel.
--
-- En la tabla productos, precioGranel ya trae un descuento sobre precioLista,
-- distinto según la familia: Bulonería 50%, Mechas ~70%, Tolsen y Electrodos 0%.
-- Ese descuento nunca se mostraba, así que la proforma listaba "5% + 20% + 5%"
-- para un precio que en realidad tenía 63,9% de descuento. No cerraba.
--
-- Ahora se guarda en cada renglón y se muestra como un paso más de la cadena.

ALTER TABLE aprobaciones_items
  ADD COLUMN IF NOT EXISTS descBase DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Para los renglones que ya existen se calcula desde los precios guardados.
UPDATE aprobaciones_items
   SET descBase = ROUND((1 - precioGranel / precioLista) * 100, 2)
 WHERE descBase = 0
   AND precioLista > 0
   AND precioGranel > 0
   AND precioGranel < precioLista;
