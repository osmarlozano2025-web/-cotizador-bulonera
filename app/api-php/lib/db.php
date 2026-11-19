<?php

/** $nuevo = true descarta la conexión vieja (el servidor de MySQL la cierra si pasa un rato sin usarla). */
function obtenerPDO(bool $nuevo = false): PDO
{
    static $pdo = null;
    if ($nuevo) $pdo = null;
    if ($pdo) return $pdo;

    $cfg = require __DIR__ . '/../config.php';
    $db = $cfg['db'];
    $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['database']};charset=utf8mb4";

    $pdo = new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

/**
 * La conexión, o una nueva si MySQL la cerró. Pasa cuando entre una consulta y la
 * siguiente hubo una espera larga (leer una foto con la IA, consultar a Tango).
 */
function pdoVivo(PDO $pdo): PDO
{
    try {
        $pdo->query('SELECT 1');
        return $pdo;
    } catch (Throwable $e) {
        return obtenerPDO(true);
    }
}
