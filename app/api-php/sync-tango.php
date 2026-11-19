<?php
/**
 * Copia los artículos de Tango a la base de la app. Para una tarea programada
 * (cron) del hosting o para correr a mano. Sólo por consola.
 *
 *   php api-php/sync-tango.php            todo el catálogo
 *   php api-php/sync-tango.php --desde 3  sigue desde la página 3
 *   php api-php/sync-tango.php --simular  cuenta lo que haría, sin guardar nada
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/tango_sync.php';

$desde = 0;
$i = array_search('--desde', $argv ?? [], true);
if ($i !== false) $desde = (int) ($argv[$i + 1] ?? 0);

$simular = in_array('--simular', $argv ?? [], true);
$pdo = obtenerPDO();
$api = TangoApi::desdeConfig($pdo, 120);
$estado = ['inicio' => date('c'), 'pagina' => $desde, 'leidos' => 0, 'nuevos' => 0, 'actualizados' => 0, 'terminado' => false];
$t0 = microtime(true);

do {
    // Leer de Tango tarda y MySQL cierra la conexión si no se usa: se verifica y, si hace falta, se reabre.
    try { $pdo->query('SELECT 1'); } catch (Throwable $e) { $pdo = obtenerPDO(true); }
    $r = sincronizarPaginaArticulos($pdo, $api, $estado['pagina'], 500, $simular);
    $estado['leidos'] += $r['leidos'];
    $estado['nuevos'] += $r['nuevos'];
    $estado['actualizados'] += $r['actualizados'];
    $estado['pagina']++;
    if ($r['fin']) { $estado['terminado'] = true; $estado['fin'] = date('c'); }
    if (!$simular) guardarEstadoSincronizacion($pdo, $estado);
    printf("página %d: %d leídos, %d nuevos, %d actualizados (%.0f s)\n", $r['pagina'], $r['leidos'], $r['nuevos'], $r['actualizados'], microtime(true) - $t0);
} while (!$estado['terminado']);

echo ($simular ? '(SIMULACRO, no se guardó nada) ' : '') . "Listo: {$estado['leidos']} artículos, {$estado['nuevos']} nuevos, {$estado['actualizados']} actualizados\n";
