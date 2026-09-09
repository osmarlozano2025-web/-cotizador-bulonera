-- V007: el descuento de lista deja de estar escondido en los precios.
--
-- Hasta acá, `productos.precioGranel` traía metido un descuento sobre
-- `precioLista` que variaba por familia y que nadie podía ver ni editar:
-- Bulonería 50%, Mechas 70,11%, Tolsen y Electrodos 0%. Por eso la proforma
-- mostraba "5% + 20% + 5%" en un renglón con 63,9% de descuento real.
--
-- Ahora ese porcentaje vive acá, editable, y el precio se calcula desde el de
-- lista. Los valores que se cargan son los que ya estaban aplicados, así que
-- el precio de la enorme mayoría de los productos no cambia.

INSERT INTO configuraciones (clave, valor, descripcion, tipo)
SELECT * FROM (
  SELECT 'descuento_lista_buloneria'  clave, '{"valor": 50}'    valor, 'Descuento de lista Bulonería'  descripcion, 'descuento_familia' tipo
  UNION ALL SELECT 'descuento_lista_tolsen',     '{"valor": 0}',     'Descuento de lista Tolsen',     'descuento_familia'
  UNION ALL SELECT 'descuento_lista_mechas',     '{"valor": 70.11}', 'Descuento de lista Mechas',     'descuento_familia'
  UNION ALL SELECT 'descuento_lista_electrodos', '{"valor": 0}',     'Descuento de lista Electrodos', 'descuento_familia'
) nuevos
WHERE NOT EXISTS (SELECT 1 FROM configuraciones c WHERE c.clave = nuevos.clave);
