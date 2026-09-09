-- V017: Agregar nuevas familias - Escaleras y Cintas Métricas

INSERT INTO configuraciones (clave, valor, descripcion, activo)
VALUES
  ('descuento_escaleras', '{"limite": -20}', 'Tope de descuento para Escaleras. Negativo descuenta, positivo aumenta. En el pedido se arranca en 0 y se puede mejorar hasta acá.', 1),
  ('descuento_cintas_metricas', '{"limite": -20}', 'Tope de descuento para Cintas Métricas. Negativo descuenta, positivo aumenta. En el pedido se arranca en 0 y se puede mejorar hasta acá.', 1)
ON DUPLICATE KEY UPDATE activo = 1;
