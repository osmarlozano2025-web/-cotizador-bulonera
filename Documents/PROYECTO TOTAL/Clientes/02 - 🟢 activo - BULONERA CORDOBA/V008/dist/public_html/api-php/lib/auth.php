<?php
require_once __DIR__ . '/response.php';

function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/'));
}

function firmarToken(array $usuario): string
{
    $cfg = require __DIR__ . '/../config.php';
    $header = base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64UrlEncode(json_encode([
        'id' => $usuario['id'],
        'rol' => $usuario['rol'],
        'iat' => time(),
        'exp' => time() + 30 * 24 * 60 * 60, // 30 días
    ]));
    $firma = base64UrlEncode(hash_hmac('sha256', "$header.$payload", $cfg['jwt_secret'], true));
    return "$header.$payload.$firma";
}

function verificarToken(string $token): ?array
{
    $cfg = require __DIR__ . '/../config.php';
    $partes = explode('.', $token);
    if (count($partes) !== 3) return null;
    [$header, $payload, $firma] = $partes;

    $esperada = base64UrlEncode(hash_hmac('sha256', "$header.$payload", $cfg['jwt_secret'], true));
    if (!hash_equals($esperada, $firma)) return null;

    $datos = json_decode(base64UrlDecode($payload), true);
    if (!$datos || (isset($datos['exp']) && $datos['exp'] < time())) return null;
    return $datos;
}

function encontrarHeaderAuthorization(): string
{
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) return $_SERVER['HTTP_AUTHORIZATION'];
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];

    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $nombre => $valor) {
            if (strcasecmp($nombre, 'Authorization') === 0) return $valor;
        }
    }
    if (function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $nombre => $valor) {
            if (strcasecmp($nombre, 'Authorization') === 0) return $valor;
        }
    }
    return '';
}

function obtenerAuth(): ?array
{
    $header = encontrarHeaderAuthorization();
    if (!str_starts_with($header, 'Bearer ')) return null;
    return verificarToken(substr($header, 7));
}

function requireAuth(): array
{
    $auth = obtenerAuth();
    if (!$auth) jsonError('No autenticado', 401);
    return $auth;
}

function requireRole(array $auth, array $rolesPermitidos): void
{
    if (!in_array($auth['rol'], $rolesPermitidos, true)) {
        jsonError('No tenés permiso para esta acción', 403);
    }
}
