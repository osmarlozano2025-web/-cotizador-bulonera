-- Transporte del cliente y quién cargó el pedido.
--
-- El transporte es un dato de la ficha del cliente (siempre despacha por el
-- mismo), no del pedido: va en la proforma debajo del domicilio para que el
-- depósito sepa por dónde sale la mercadería sin tener que preguntar.
--
-- El autor queda grabado en el pedido en el momento de crearlo. El log de
-- eventos ya lo anotaba, pero ahí es un renglón más de historial: esto es el
-- dato de la cabecera, el que se imprime en la hoja. No se puede editar desde
-- ninguna pantalla ni ruta de la API — sólo tocando la base a mano.
--
-- Sentencias separadas: si una columna ya existiera de una corrida parcial,
-- el runner debe poder saltarla sin perder las demás (ver migrate.php).

ALTER TABLE clientes ADD COLUMN transporte VARCHAR(150) NULL;

ALTER TABLE aprobaciones ADD COLUMN creadoPorId VARCHAR(40) NULL;
ALTER TABLE aprobaciones ADD COLUMN creadoPorNombre VARCHAR(120) NULL;
