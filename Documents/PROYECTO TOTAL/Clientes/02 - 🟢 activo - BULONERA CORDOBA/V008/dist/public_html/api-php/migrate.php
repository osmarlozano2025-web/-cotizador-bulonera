<?php
/**
 * Runner de migraciones.
 *
 *   php api-php/migrate.php          aplica lo que falte
 *   php api-php/migrate.php --estado sólo informa, no toca nada
 *
 * Aplica en orden los .sql de api-php/db/ y anota cada uno en la tabla
 * `migraciones`, así correrlo dos veces no rompe nada.
 *
 * Antes apuntaba a un directorio db/ que no existía dentro de api-php (los
 * .sql vivían en server/db/), con lo cual fallaba en cualquier instalación
 * limpia. Los .sql ahora viven acá.
 */

require_once __DIR__ . '/lib/db.php';

$soloEstado = in_array('--estado', $argv ?? [], true);
$dir = __DIR__ . '/db';

/**
 * Parte un archivo .sql en sentencias sueltas respetando comillas y comentarios,
 * para no cortar en un ';' que esté dentro de un string.
 */
function separarSentencias(string $sql): array
{
    $sentencias = [];
    $actual = '';
    $comilla = null;
    $largo = strlen($sql);

    for ($i = 0; $i < $largo; $i++) {
        $c = $sql[$i];

        if ($comilla === null && $c === '-' && ($sql[$i + 1] ?? '') === '-') {
            while ($i < $largo && $sql[$i] !== "\n") $i++;
            $actual .= "\n";
            continue;
        }

        if ($comilla !== null) {
            $actual .= $c;
            if ($c === '\\') {                    // escape: se lleva el siguiente
                $actual .= $sql[++$i] ?? '';
            } elseif ($c === $comilla) {
                $comilla = null;
            }
            continue;
        }

        if ($c === "'" || $c === '"' || $c === '`') {
            $comilla = $c;
            $actual .= $c;
            continue;
        }

        if ($c === ';') {
            if (trim($actual) !== '') $sentencias[] = trim($actual);
            $actual = '';
            continue;
        }

        $actual .= $c;
    }

    if (trim($actual) !== '') $sentencias[] = trim($actual);
    return $sentencias;
}

try {
    $pdo = obtenerPDO();

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS migraciones (
            archivo   VARCHAR(120) PRIMARY KEY,
            aplicadaEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    $aplicadas = $pdo->query('SELECT archivo FROM migraciones')->fetchAll(PDO::FETCH_COLUMN);

    if (!is_dir($dir)) {
        echo "No existe el directorio de migraciones: $dir\n";
        exit(1);
    }

    $archivos = glob("$dir/*.sql");
    sort($archivos);

    if (!$archivos) {
        echo "No hay migraciones en $dir\n";
        exit(0);
    }

    $pendientes = 0;

    foreach ($archivos as $ruta) {
        $nombre = basename($ruta);

        if (in_array($nombre, $aplicadas, true)) {
            echo "  ya aplicada   $nombre\n";
            continue;
        }

        $pendientes++;

        if ($soloEstado) {
            echo "  PENDIENTE     $nombre\n";
            continue;
        }

        echo "  aplicando     $nombre ... ";
        $sentencias = separarSentencias(file_get_contents($ruta));

        foreach ($sentencias as $sentencia) {
            try {
                $pdo->exec($sentencia);
            } catch (PDOException $e) {
                // Estas migraciones son idempotentes por diseño; si una columna
                // o tabla ya existe seguimos, cualquier otro error corta.
                $duplicado = str_contains($e->getMessage(), 'Duplicate column')
                    || str_contains($e->getMessage(), 'already exists')
                    || str_contains($e->getMessage(), 'Duplicate key name')
                    || str_contains($e->getMessage(), 'Duplicate entry');
                if (!$duplicado) {
                    echo "\n     ERROR en: " . substr(preg_replace('/\s+/', ' ', $sentencia), 0, 120) . "\n";
                    throw $e;
                }
            }
        }

        $pdo->prepare('INSERT INTO migraciones (archivo) VALUES (?)')->execute([$nombre]);
        echo "ok (" . count($sentencias) . " sentencias)\n";
    }

    if ($soloEstado) {
        echo $pendientes ? "\n$pendientes migración/es pendiente/s\n" : "\nTodo al día\n";
    } else {
        echo $pendientes ? "\nListo: $pendientes migración/es aplicada/s\n" : "\nNo había nada pendiente\n";
    }
} catch (Throwable $e) {
    echo "\nFalló la migración: " . $e->getMessage() . "\n";
    exit(1);
}
