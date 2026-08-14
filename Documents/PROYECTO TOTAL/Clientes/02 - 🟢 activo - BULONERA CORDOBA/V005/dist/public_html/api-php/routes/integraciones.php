<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';

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
    requireRole($auth, ['Administrador']);

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
    ]);
}

function rutaIntegracionesActualizar(): void
{
    $auth = requireAuth();
    requireRole($auth, ['Administrador']);

    $body = cuerpoJson();
    $pdo = obtenerPDO();

    foreach (['openaiApiKey', 'tangoApiKey'] as $clave) {
        if (!empty($body[$clave])) {
            $stmt = $pdo->prepare('INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
            $stmt->execute([$clave, $body[$clave]]);
        }
    }
    jsonSalida(['ok' => true]);
}
