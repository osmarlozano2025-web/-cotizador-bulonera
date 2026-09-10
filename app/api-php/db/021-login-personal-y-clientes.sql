-- Login propio para personal (con verificación de email) y para clientes
-- (con verificación de email, usando su email o su CUIT para entrar).
-- Sentencias separadas: si una columna ya existiera de una corrida parcial,
-- el runner debe poder saltarla sin perder las demás (ver migrate.php).

ALTER TABLE personal MODIFY usuario VARCHAR(60) NULL;
ALTER TABLE personal ADD COLUMN email VARCHAR(150) NULL UNIQUE;
ALTER TABLE personal ADD COLUMN emailVerificado TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE personal ADD COLUMN tokenVerificacion VARCHAR(100) NULL;
ALTER TABLE personal ADD COLUMN tokenExpira DATETIME NULL;

ALTER TABLE clientes ADD COLUMN passwordHash VARCHAR(100) NULL;
ALTER TABLE clientes ADD COLUMN emailVerificado TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE clientes ADD COLUMN tokenVerificacion VARCHAR(100) NULL;
ALTER TABLE clientes ADD COLUMN tokenExpira DATETIME NULL;
