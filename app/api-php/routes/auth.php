<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';

function sinPasswordPersonal(array $u): array
{
    unset($u['passwordHash']);
    $u['permisos'] = json_decode($u['permisos'], true);
    $u['activo'] = (bool) $u['activo'];
    return $u;
}

function rutaAuthLogin(): void
{
    $body = cuerpoJson();
    $usuario = $body['usuario'] ?? '';
    $password = $body['password'] ?? '';

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM personal WHERE usuario = ? AND activo = 1');
    $stmt->execute([$usuario]);
    $persona = $stmt->fetch();

    if (!$persona || !password_verify($password, $persona['passwordHash'])) {
        jsonError('Usuario o contraseña incorrectos', 401);
    }

    jsonSalida([
        'token' => firmarToken($persona),
        'user' => sinPasswordPersonal($persona),
    ]);
}

function rutaAuthMe(): void
{
    $auth = requireAuth();
    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM personal WHERE id = ? AND activo = 1');
    $stmt->execute([$auth['id']]);
    $persona = $stmt->fetch();
    if (!$persona) jsonError('Sesión inválida', 401);
    jsonSalida(sinPasswordPersonal($persona));
}
