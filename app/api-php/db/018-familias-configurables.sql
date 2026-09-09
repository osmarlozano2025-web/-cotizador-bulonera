-- Las familias de producto pasan a ser un dato, no una lista escrita en el código.
--
-- Estaban repetidas en seis archivos entre el backend y el frontend. Agregar
-- una obligaba a tocar los seis, y olvidarse de uno la dejaba a medias: se veía
-- en Configuraciones pero el cálculo no la reconocía, así que su descuento
-- nunca se aplicaba y sus productos no llegaban a ningún depósito.
--
-- El orden es el que se usa para mostrarlas y para numerar los depósitos.

INSERT INTO configuraciones (clave, valor, descripcion, tipo, activo) VALUES (
  'familias',
  '[{"clave":"buloneria","nombre":"Bulonería","orden":1},
    {"clave":"tolsen","nombre":"Tolsen","orden":2},
    {"clave":"mechas","nombre":"Mechas","orden":3},
    {"clave":"electrodos","nombre":"Electrodos","orden":4},
    {"clave":"escaleras","nombre":"Escaleras","orden":5},
    {"clave":"cintas_metricas","nombre":"Cintas Métricas","orden":6}]',
  'Familias de producto: nombre y orden en que se muestran',
  'otro',
  1
) ON DUPLICATE KEY UPDATE activo = 1;
