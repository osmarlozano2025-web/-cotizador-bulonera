<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/tango_datos.php';
require_once __DIR__ . '/../lib/tango_sync.php';

/**
 * Consultas en vivo a Tango. Todas leen, ninguna escribe en Tango ni en la
 * base de la app. Si Tango no responde, el error dice por qué (sin dirección,
 * token rechazado, no se pudo conectar) en vez de devolver una lista vacía
 * que parezca "no hay clientes".
 */

/** Sólo personal: un cliente logueado no busca en la base de clientes de la bulonera. */
function soloPersonal(array $auth): void
{
    if (($auth['rol'] ?? null) === 'Cliente') jsonError('No tenés acceso a esto', 403);
}

/** Un valor JSON guardado en config, o [] si no hay o está mal. */
function configJson(PDO $pdo, string $clave): array
{
    $stmt = $pdo->prepare('SELECT valor FROM config WHERE clave = ?');
    $stmt->execute([$clave]);
    $valor = json_decode((string) $stmt->fetchColumn(), true);
    return is_array($valor) ? $valor : [];
}

/** GET /tango/clientes?q= — clientes de Tango, con lo que la app sabe de cada uno. */
function rutaTangoClientes(): void
{
    $auth = requireAuth();
    soloPersonal($auth);
    $pdo = obtenerPDO();

    try {
        $clientes = buscarClientesTango(TangoApi::desdeConfig($pdo), (string) ($_GET['q'] ?? ''));
    } catch (TangoApiException $e) {
        jsonError($e->getMessage() . ($e->detalle ? ' — ' . $e->detalle : ''), 502);
    }
    jsonSalida(completarClientesConLaApp($pdo, $clientes));
}

/** GET /tango/articulos?q= — artículos de Tango, con fracción, granel y familia de la app. */
function rutaTangoArticulos(): void
{
    $auth = requireAuth();
    soloPersonal($auth);
    $pdo = obtenerPDO();

    try {
        $articulos = buscarArticulosTango(TangoApi::desdeConfig($pdo), (string) ($_GET['q'] ?? ''));
    } catch (TangoApiException $e) {
        jsonError($e->getMessage() . ($e->detalle ? ' — ' . $e->detalle : ''), 502);
    }
    jsonSalida(completarArticulosConLaApp($pdo, $articulos, configJson($pdo, 'tangoFamilias')));
}

/**
 * GET /integraciones/tango/explorar?proceso=87&cantidad=2 — las primeras filas
 * de un proceso, tal cual las devuelve Tango.
 *
 * Es para el día que se conecte: ver qué campos trae cada proceso de esta
 * instalación y probar números de proceso (precios, stock) sin tocar código.
 * Sólo administración, sólo lectura y a lo sumo 5 filas.
 */
function rutaIntegracionesExplorarTango(): void
{
    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);

    $proceso = (int) ($_GET['proceso'] ?? 0);
    if ($proceso <= 0) jsonError('Falta el número de proceso', 422);
    $cantidad = min(5, max(1, (int) ($_GET['cantidad'] ?? 2)));

    try {
        $filas = TangoApi::desdeConfig(obtenerPDO())->listar($proceso, $cantidad, 0);
    } catch (TangoApiException $e) {
        jsonError($e->getMessage() . ($e->detalle ? ' — ' . $e->detalle : ''), 502);
    }
    jsonSalida(['proceso' => $proceso, 'campos' => $filas ? array_keys($filas[0]) : [], 'filas' => $filas]);
}

/** GET /tango/sincronizacion — cómo va la copia del catálogo de Tango y cuántos productos hay. */
function rutaTangoSincronizacionEstado(): void
{
    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);
    $pdo = obtenerPDO();
    jsonSalida(estadoSincronizacion($pdo) + ['productosEnLaApp' => (int) $pdo->query('SELECT COUNT(*) FROM productos')->fetchColumn()]);
}

/**
 * POST /tango/sincronizar — copia artículos de Tango a la base de la app, por
 * tandas. Cada llamada trabaja hasta unos 45 segundos y devuelve el avance;
 * la pantalla la repite hasta que `terminado` sea true. Con {"reiniciar": true}
 * arranca de nuevo desde el principio.
 */
function rutaTangoSincronizar(): void
{
    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);
    @set_time_limit(120);

    $body = cuerpoJson();
    $pdo = obtenerPDO();
    $estado = estadoSincronizacion($pdo);

    if (!empty($body['reiniciar']) || empty($estado) || !empty($estado['terminado'])) {
        $estado = ['inicio' => date('c'), 'pagina' => 0, 'leidos' => 0, 'nuevos' => 0, 'actualizados' => 0, 'terminado' => false];
    }

    $api = TangoApi::desdeConfig($pdo, 60);
    $limite = microtime(true) + 45;
    try {
        do {
            try { $pdo->query('SELECT 1'); } catch (Throwable $e) { $pdo = obtenerPDO(true); }
            $r = sincronizarPaginaArticulos($pdo, $api, (int) $estado['pagina'], 500);
            $estado['leidos'] += $r['leidos'];
            $estado['nuevos'] += $r['nuevos'];
            $estado['actualizados'] += $r['actualizados'];
            $estado['pagina']++;
            if ($r['fin']) { $estado['terminado'] = true; $estado['fin'] = date('c'); }
            guardarEstadoSincronizacion($pdo, $estado);
        } while (!$estado['terminado'] && microtime(true) < $limite);
    } catch (TangoApiException $e) {
        guardarEstadoSincronizacion($pdo, $estado);
        jsonError('Tango no respondió: ' . $e->getMessage() . ($e->detalle ? ' — ' . $e->detalle : '') . ' (se puede seguir desde donde quedó)', 502);
    }

    jsonSalida($estado + ['productosEnLaApp' => (int) $pdo->query('SELECT COUNT(*) FROM productos')->fetchColumn()]);
}