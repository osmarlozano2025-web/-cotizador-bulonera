<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/precios.php';

function enmascarar(?string $valor): string
{
    if (!$valor) return '';
    return mb_strlen($valor) <= 6 ? '••••••' : mb_substr($valor, 0, 4) . '••••' . mb_substr($valor, -4);
}

function obtenerConfigDB(PDO $pdo): array
{
    $rows = $pdo->query('SELECT clave, valor FROM config')->fetchAll();
    $cfg = [];
    foreach ($rows as $r) $cfg[$r['clave']] = $r['valor'];
    return $cfg;
}

function rutaIntegracionesObtener(): void
{
    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);

    $pdo = obtenerPDO();
    $cfg = obtenerConfigDB($pdo);
    $cfgArchivo = require __DIR__ . '/../config.php';

    $openai = $cfg['openaiApiKey'] ?? $cfgArchivo['openai_api_key'];
    $tango = $cfg['tangoApiKey'] ?? null;

    jsonSalida([
        'openaiApiKey' => enmascarar($openai),
        'openaiConfigurada' => (bool) $openai,
        'tangoApiKey' => enmascarar($tango),
        'tangoConfigurada' => (bool) $tango,
        'tangoUrl' => $cfg['tangoUrl'] ?? '',
        'tangoEmpresa' => $cfg['tangoEmpresa'] ?? '7',
        'tangoPuenteConfigurado' => !empty($cfg['tangoClavePuente']),
        // Lo guardado, sin mezclar con los por defecto: la pantalla muestra
        // los por defecto aparte, para que se vea qué se cambió a mano.
        'tangoProcesos' => json_decode($cfg['tangoProcesos'] ?? '{}', true) ?: new stdClass(),
        'tangoFamilias' => json_decode($cfg['tangoFamilias'] ?? '{}', true) ?: new stdClass(),
    ]);
}

/**
 * POST /integraciones/tango/probar — una lectura de un artículo para ver si la
 * dirección, el token y la empresa guardados llegan a Tango. No escribe nada.
 */
function rutaIntegracionesProbarTango(): void
{
    require_once __DIR__ . '/../lib/tango_api.php';

    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);

    try {
        jsonSalida(TangoApi::desdeConfig(obtenerPDO())->probarConexion());
    } catch (TangoApiException $e) {
        jsonError($e->getMessage() . ($e->detalle ? ' — ' . $e->detalle : ''), 502);
    }
}

function rutaIntegracionesActualizar(): void
{
    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);

    $body = cuerpoJson();
    $pdo = obtenerPDO();

    // Los datos de Tango son varios: dirección y empresa se pueden cambiar de a
    // uno, y la dirección se guarda sin la barra final.
    if (isset($body['tangoUrl'])) $body['tangoUrl'] = rtrim(trim((string) $body['tangoUrl']), '/');
    if (isset($body['tangoUrl']) && $body['tangoUrl'] !== '') {
        $partes = parse_url($body['tangoUrl']);
        $host = strtolower($partes['host'] ?? '');
        $esLocal = in_array($host, ['localhost', '127.0.0.1'], true);
        // La clave de Tango viaja en cada llamada: sin cifrar sólo se admite en la propia máquina.
        if (!$host || !in_array($partes['scheme'] ?? '', ['http', 'https'], true)
            || (($partes['scheme'] ?? '') === 'http' && !$esLocal)
            || isset($partes['user']) || isset($partes['pass'])) {
            jsonError('La dirección de Tango tiene que ser https:// (y no llevar usuario ni clave en la dirección)', 422);
        }
    }
    if (isset($body['tangoEmpresa']) && !ctype_digit((string) $body['tangoEmpresa'])) {
        jsonError('La empresa de Tango es un número', 422);
    }

    // Números de proceso ({"clientes": 2117}) y mapa de familias de Tango a
    // familias de la app ({"BUL": "buloneria"}): se guardan como JSON. Un
    // proceso vacío o en 0 se borra y vuelve a valer el por defecto.
    if (isset($body['tangoProcesos'])) {
        if (!is_array($body['tangoProcesos'])) jsonError('Los procesos de Tango van como lista nombre → número', 422);
        $procesos = [];
        foreach ($body['tangoProcesos'] as $nombre => $numero) {
            if (!preg_match('/^[a-z]+$/', (string) $nombre)) jsonError("Proceso de Tango inválido: $nombre", 422);
            if ($numero === '' || $numero === null || (int) $numero === 0) continue;
            if (!ctype_digit((string) $numero)) jsonError("El proceso de $nombre tiene que ser un número", 422);
            $procesos[$nombre] = (int) $numero;
        }
        $body['tangoProcesos'] = json_encode((object) $procesos);
    }
    if (isset($body['tangoFamilias'])) {
        if (!is_array($body['tangoFamilias'])) jsonError('Las familias de Tango van como lista familia de Tango → familia de la app', 422);
        $familias = familiasConfiguradas($pdo);
        foreach ($body['tangoFamilias'] as $deTango => $deApp) {
            if (!isset($familias[$deApp])) jsonError("La familia $deApp no existe en la app", 422);
        }
        $body['tangoFamilias'] = json_encode((object) $body['tangoFamilias'], JSON_UNESCAPED_UNICODE);
    }

    foreach (['openaiApiKey', 'tangoApiKey', 'tangoUrl', 'tangoEmpresa', 'tangoClavePuente', 'tangoProcesos', 'tangoFamilias'] as $clave) {
        if (!empty($body[$clave])) {
            $stmt = $pdo->prepare('INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
            $stmt->execute([$clave, $body[$clave]]);
        }
    }
    jsonSalida(['ok' => true]);
}
