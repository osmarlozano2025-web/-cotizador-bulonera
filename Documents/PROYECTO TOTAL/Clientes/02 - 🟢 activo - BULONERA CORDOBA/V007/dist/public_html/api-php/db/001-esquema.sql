-- Esquema completo del cotizador Córdoba Bulones (MySQL / MariaDB, compatible con Hostinger)

CREATE TABLE IF NOT EXISTS tipos_descuento (
  codigo      VARCHAR(5) PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL,
  porcentaje  DECIMAL(5,2) NOT NULL DEFAULT 0,
  color       VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS clientes (
  id             VARCHAR(30) PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  razonSocial    VARCHAR(150),
  cuit           VARCHAR(20),
  telefono       VARCHAR(40),
  email          VARCHAR(150),
  localidad      VARCHAR(100),
  provincia      VARCHAR(100),
  tipoDescuento  VARCHAR(5),
  descuento      DECIMAL(5,2) DEFAULT 0,
  creadoEn       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tipoDescuento) REFERENCES tipos_descuento(codigo) ON DELETE SET NULL,
  INDEX idx_clientes_nombre (nombre),
  INDEX idx_clientes_localidad (localidad)
);

CREATE TABLE IF NOT EXISTS productos (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  codigo         VARCHAR(50),
  descripcion    VARCHAR(255) NOT NULL,
  medida         TEXT,
  marca          VARCHAR(100),
  familia        VARCHAR(30) NOT NULL,
  subfamilia     VARCHAR(100),
  unidadGranel   DECIMAL(12,2),
  unidadFraccion DECIMAL(12,2),
  precioLista    DECIMAL(14,2),
  precioGranel   DECIMAL(14,2),
  stock          INT,
  INDEX idx_productos_familia (familia),
  FULLTEXT INDEX idx_productos_busqueda (descripcion, codigo, medida)
);

CREATE TABLE IF NOT EXISTS personal (
  id             VARCHAR(30) PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  usuario        VARCHAR(60) NOT NULL UNIQUE,
  passwordHash   VARCHAR(100) NOT NULL,
  rol            VARCHAR(30) NOT NULL,
  permisos       JSON NOT NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS config (
  clave  VARCHAR(50) PRIMARY KEY,
  valor  TEXT
);

CREATE TABLE IF NOT EXISTS aprobaciones (
  id                VARCHAR(30) PRIMARY KEY,
  token             VARCHAR(40) NOT NULL UNIQUE,
  clienteId         VARCHAR(30),
  clienteNombre     VARCHAR(150),
  clienteTelefono   VARCHAR(40),
  clienteEmail      VARCHAR(150),
  descuento         DECIMAL(5,2) DEFAULT 0,
  total             DECIMAL(14,2) DEFAULT 0,
  estado            VARCHAR(30) NOT NULL DEFAULT 'en_aprobacion',
  fechaCreacion     DATETIME DEFAULT CURRENT_TIMESTAMP,
  fechaEnvioCliente DATETIME NULL,
  fechaConfirmacion DATETIME NULL,
  FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE SET NULL,
  INDEX idx_aprobaciones_estado (estado),
  INDEX idx_aprobaciones_token (token)
);

CREATE TABLE IF NOT EXISTS aprobaciones_subpedidos (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  aprobacionId     VARCHAR(30) NOT NULL,
  familia          VARCHAR(30) NOT NULL,
  aprobado         TINYINT(1) NOT NULL DEFAULT 0,
  aprobadoPor      VARCHAR(30),
  fechaAprobacion  DATETIME NULL,
  FOREIGN KEY (aprobacionId) REFERENCES aprobaciones(id) ON DELETE CASCADE,
  INDEX idx_subpedidos_aprobacion (aprobacionId)
);

CREATE TABLE IF NOT EXISTS aprobaciones_items (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  subpedidoId    BIGINT NOT NULL,
  codigo         VARCHAR(50),
  descripcion    VARCHAR(255) NOT NULL,
  medida         TEXT,
  marca          VARCHAR(100),
  familia        VARCHAR(30),
  subfamilia     VARCHAR(100),
  precioGranel   DECIMAL(14,2) DEFAULT 0,
  cantidad       DECIMAL(10,2) NOT NULL DEFAULT 1,
  FOREIGN KEY (subpedidoId) REFERENCES aprobaciones_subpedidos(id) ON DELETE CASCADE,
  INDEX idx_items_subpedido (subpedidoId)
);
