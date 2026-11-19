<?php
/**
 * Prueba a mano la lectura de una foto de pedido, de punta a punta.
 *
 *   php api-php/tests/foto-prueba.php ruta/a/foto.jpg          lee con la IA y busca
 *   php api-php/tests/foto-prueba.php --json renglones.json    salta la IA, usa renglones ya leídos
 *
 * Usa el .env de api-php (la base y la clave de OpenAI). Sólo lee: no escribe
 * nada en la base. Sólo por consola.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/openai.php';
require_once __DIR__ . '/../routes/tango.php';
require_once __DIR__ . '/../routes/productos.php';

$args = array_slice($argv, 1);
if (!$args) { fwrite(STDERR, "Uso: php foto-prueba.php <foto> | --json <archivo>\n"); exit(1); }

if ($args[0] === '--json') {
    $renglones = normalizarRenglonesLeidos(json_decode(file_get_contents($args[1]), true)['items'] ?? []);
} else {
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($args[0]);
    echo "Leyendo la foto con la IA ($mime)...\n";
    $t = microtime(true);
    $renglones = leerPedidoDeImagen(base64_encode(file_get_contents($args[0])), $mime);
    printf("La IA leyó %d renglones en %.1f s\n", count($renglones), microtime(true) - $t);
    file_put_contents(__DIR__ . '/../storage/ultima-lectura.json', json_encode(['items' => $renglones], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

$t = microtime(true);
$res = resolverRenglones(obtenerPDO(true), $renglones);
printf("Búsqueda en catálogo: %.1f s · Tango: %s\n\n", microtime(true) - $t,
    $res['tango']['disponible'] ? ($res['tango']['consultado'] ? 'consultado' : 'no hizo falta') : 'NO disponible (' . $res['tango']['mensaje'] . ')');

$sinOpciones = 0;
foreach ($res['items'] as $i => $it) {
    $d = $it['detectado'];
    printf("%2d. %s%s  x%s%s\n", $i + 1, $d['producto'], $d['medida'] !== '' ? "  [{$d['medida']}]" : '', $d['cantidad'] ?? '?', $d['dudoso'] ? '  (dudoso)' : '');
    if (!$it['sugerencias']) { echo "      (sin opciones)\n"; $sinOpciones++; continue; }
    foreach ($it['sugerencias'] as $k => $s) {
        $marca = $it['matchExacto'] && $it['matchExacto']['codigo'] === $s['codigo'] && $k === 0 ? '★' : ' ';
        printf("    %s %.2f %-5s %s · %s · %s%s\n", $marca, $s['puntaje'], $s['origen'], $s['codigo'], $s['descripcion'], $s['medida'] ?? '',
            empty($s['medidaCoincide']) ? '  (otra medida)' : '');
    }
}
printf("\n%d renglones, %d sin ninguna opción\n", count($res['items']), $sinOpciones);
