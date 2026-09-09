-- V002: Tabla de Configuraciones
CREATE TABLE IF NOT EXISTS configuraciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor JSON NOT NULL,
  descripcion TEXT,
  tipo ENUM('descuento_familia', 'descuento_pago', 'tamaño_caja', 'otro') DEFAULT 'otro',
  editado_por INT,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT 1,
  INDEX idx_clave (clave),
  INDEX idx_tipo (tipo),
  FOREIGN KEY (editado_por) REFERENCES personal(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales
INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES
('descuento_buloneria', '{"desc_1": 25, "desc_2": 0}', 'Descuentos Bulonería (directo 25%)', 'descuento_familia'),
('descuento_tolsen', '{"desc_1": 55, "desc_2": 18}', 'Descuentos Tolsen (55% + 18%)', 'descuento_familia'),
('descuento_mechas', '{"desc_1": 55, "desc_2": 18}', 'Descuentos Mechas (55% + 18%)', 'descuento_familia'),
('descuento_electrodos', '{"desc_1": 0, "desc_2": 0}', 'Electrodos - Precio Neto (sin descuento)', 'descuento_familia'),
('descuento_contado', '{"desc_1": 0, "desc_2": 0}', 'Condición Contado', 'descuento_pago'),
('descuento_30dias', '{"desc_1": 5, "desc_2": 0}', 'Condición 30 días', 'descuento_pago'),
('descuento_60dias', '{"desc_1": 0, "desc_2": 0}', 'Condición 60 días', 'descuento_pago'),
('tiempo_reserva_stock', '{"minutos": 30}', 'Tiempo que se reserva un producto (minutos)', 'otro'),
('cache_stock_ttl', '{"segundos": 300}', 'TTL del caché de stock en segundos (5 min)', 'otro');
