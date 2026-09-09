<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/auth.php';

function requireAdmin(): array
{
    $auth = requireAuth();
    requireRole($auth, ['Administrador']);
    return $auth;
}

function rutaPersonalListar(): void
{
    requireAdmin();
    $pdo = obtenerPDO();
    $rows = $pdo->query('SELECT * FROM personal ORDER BY nombre')->fetchAll();
    jsonSalida(array_map('sinPasswordPersonal', $rows));
}

function rutaPersonalCrear(): void
{
    requireAdmin();
    $body = cuerpoJson();
    $nombre = $body['nombre'] ?? '';
    $usuario = $body['usuario'] ?? '';
    $password = $body['password'] ?? '';
    $rol = $body['rol'] ?? '';
    $permisos = $body['permisos'] ?? ['secciones' => [], 'puedeAprobarFamilias' => false, 'puedeEnviarCliente' => false];

    if (!$nombre || !$usuario || !$password || !$rol) {
        jsonError('Faltan datos obligatorios', 400);
    }

    $pdo = obtenerPDO();
    $existe = $pdo->prepare('SELECT id FROM personal WHERE usuario = ?');
    $existe->execute([$usuario]);
    if ($existe->fetch()) jsonError('Ese usuario ya existe', 409);

    $id = (string) round(microtime(true) * 1000);
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare('INSERT INTO personal (id, nombre, usuario, passwordHash, rol, permisos, activo) VALUES (?, ?, ?, ?, ?, ?, 1)');
    $stmt->execute([$id, $nombre, $usuario, $hash, $rol, json_encode($permisos)]);

    jsonSalida(sinPasswordPersonal([
        'id' => $id, 'nombre' => $nombre, 'usuario' => $usuario, 'passwordHash' => $hash,
        'rol' => $rol, 'permisos' => json_encode($permisos), 'activo' => 1,
    ]), 201);
}

function rutaPersonalActualizar(string $id): void
{
    $auth = requireAdmin();
    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM personal WHERE id = ?');
    $stmt->execute([$id]);
    $actual = $stmt->fetch();
    if (!$actual) jsonError('No encontrado', 404);

    $body = cuerpoJson();
    $usuario = $body['usuario'] ?? $actual['usuario'];

    if ($usuario !== $actual['usuario']) {
        $existe = $pdo->prepare('SELECT id FROM personal WHERE usuario = ? AND id != ?');
        $existe->execute([$usuario, $id]);
        if ($existe->fetch()) jsonError('Ese usuario ya existe', 409);
    }

    $datos = [
        'nombre' => $body['nombre'] ?? $actual['nombre'],
        'usuario' => $usuario,
        'rol' => $body['rol'] ?? $actual['rol'],
        'permisos' => json_encode($body['permisos'] ?? json_decode($actual['permisos'], true)),
        'activo' => isset($body['activo']) ? ($body['activo'] ? 1 : 0) : $actual['activo'],
        'passwordHash' => !empty($body['password']) ? password_hash($body['password'], PASSWORD_BCRYPT) : $actual['passwordHash'],
    ];

    $stmt = $pdo->prepare('UPDATE personal SET nombre=?, usuario=?, rol=?, permisos=?, activo=?, passwordHash=? WHERE id=?');
    $stmt->execute([$datos['nombre'], $datos['usuario'], $datos['rol'], $datos['permisos'], $datos['activo'], $datos['passwordHash'], $id]);

    $stmt = $pdo->prepare('SELECT * FROM personal WHERE id = ?');
    $stmt->execute([$id]);
    jsonSalida(sinPasswordPersonal($stmt->fetch()));
}

function rutaPersonalEliminar(string $id): void
{
    $auth = requireAdmin();
    if ($id === $auth['id']) jsonError('No podés eliminar tu propio usuario', 400);
    $pdo = obtenerPDO();
    $pdo->prepare('DELETE FROM personal WHERE id = ?')->execute([$id]);
    jsonSalida(['ok' => true]);
}
