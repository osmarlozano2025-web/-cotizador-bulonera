<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/auth.php';

/** Los únicos roles que existen. Un rol inventado no daría permisos, pero tampoco tiene que poder grabarse. */
const ROLES_VALIDOS = ['SuperAdmin', 'Administrador', 'Vendedor', 'Deposito', 'Pendiente'];

/**
 * Deja los permisos con la forma que la app entiende y nada más: secciones como
 * lista de textos cortos y el resto como sí/no. Lo que sobre del JSON no se guarda.
 */
function permisosLimpios($crudos): array
{
    $crudos = is_array($crudos) ? $crudos : [];
    $secciones = array_values(array_unique(array_filter(
        is_array($crudos['secciones'] ?? null) ? $crudos['secciones'] : [],
        fn($s) => is_string($s) && preg_match('/^[a-z0-9-]{1,40}$/', $s)
    )));
    return [
        'secciones' => $secciones,
        'puedeAprobarFamilias' => !empty($crudos['puedeAprobarFamilias']),
        'puedeEnviarCliente' => !empty($crudos['puedeEnviarCliente']),
        'soloLectura' => !empty($crudos['soloLectura']),
    ];
}

function requireAdmin(): array
{
    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);
    return $auth;
}

/**
 * El rol SuperAdmin sólo lo maneja otro SuperAdmin.
 *
 * Esconder la opción en el <select> no alcanza: sin este chequeo, un
 * Administrador común podría mandar el PUT a mano y asignarse el rol, o
 * cambiarle la contraseña a un super admin para entrar como él. La regla vive
 * acá, que es el único lugar por el que pasan todos los pedidos.
 */
function requireMandoSuperAdmin(array $auth): void
{
    if (!esSuperAdmin($auth)) {
        jsonError('Sólo un Super Admin puede administrar cuentas Super Admin', 403);
    }
}

/** Cuántos super admins activos quedan, sin contar al de este id. */
function otrosSuperAdminsActivos(PDO $pdo, string $excepto): int
{
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM personal WHERE rol = 'SuperAdmin' AND activo = 1 AND id != ?");
    $stmt->execute([$excepto]);
    return (int) $stmt->fetchColumn();
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
    $auth = requireAdmin();
    $body = cuerpoJson();
    $nombre = mb_substr(trim((string) ($body['nombre'] ?? '')), 0, 100);
    $usuario = trim((string) ($body['usuario'] ?? ''));
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    $rol = (string) ($body['rol'] ?? '');
    $permisos = permisosLimpios($body['permisos'] ?? null);

    if (!$nombre || !$usuario || !$password || !$rol) {
        jsonError('Faltan datos obligatorios', 400);
    }
    if (!preg_match('/^[A-Za-z0-9._@-]{3,60}$/', $usuario)) {
        jsonError('El usuario puede tener letras, números, punto, guion y guion bajo (3 a 60 caracteres)', 422);
    }
    if (!in_array($rol, ROLES_VALIDOS, true)) jsonError('Ese rol no existe', 422);
    if ($motivo = motivoPasswordDebil($password, $usuario, $nombre)) jsonError($motivo, 422);
    if ($rol === 'SuperAdmin') requireMandoSuperAdmin($auth);

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
    $usuario = is_string($body['usuario'] ?? null) ? trim($body['usuario']) : $actual['usuario'];
    $rolNuevo = is_string($body['rol'] ?? null) ? $body['rol'] : $actual['rol'];

    if ($usuario !== $actual['usuario'] && !preg_match('/^[A-Za-z0-9._@-]{3,60}$/', (string) $usuario)) {
        jsonError('El usuario puede tener letras, números, punto, guion y guion bajo (3 a 60 caracteres)', 422);
    }
    if (!in_array($rolNuevo, ROLES_VALIDOS, true)) jsonError('Ese rol no existe', 422);
    if (!empty($body['password'])) {
        if (!is_string($body['password'])) jsonError('Contraseña inválida', 422);
        if ($motivo = motivoPasswordDebil($body['password'], (string) $usuario, (string) ($body['nombre'] ?? $actual['nombre']))) {
            jsonError($motivo, 422);
        }
    }

    // Tocar a un super admin, o convertir a alguien en uno, es cosa de super admins.
    if ($actual['rol'] === 'SuperAdmin' || $rolNuevo === 'SuperAdmin') {
        requireMandoSuperAdmin($auth);
    }
    // Que el último super admin no se deje afuera a sí mismo: si se baja el rol
    // o se da de baja y no queda ningún otro, después no hay quien reponga uno
    // salvo entrando a la base a mano.
    $sigueActivo = isset($body['activo']) ? (bool) $body['activo'] : (bool) $actual['activo'];
    if ($actual['rol'] === 'SuperAdmin' && ($rolNuevo !== 'SuperAdmin' || !$sigueActivo)
        && otrosSuperAdminsActivos($pdo, $id) === 0) {
        jsonError('Es el único Super Admin activo: asigná otro antes de cambiarle el rol o darlo de baja', 409);
    }

    if ($usuario !== $actual['usuario']) {
        $existe = $pdo->prepare('SELECT id FROM personal WHERE usuario = ? AND id != ?');
        $existe->execute([$usuario, $id]);
        if ($existe->fetch()) jsonError('Ese usuario ya existe', 409);
    }

    $datos = [
        'nombre' => isset($body['nombre']) ? mb_substr(trim((string) $body['nombre']), 0, 100) : $actual['nombre'],
        'usuario' => $usuario,
        'rol' => $rolNuevo,
        'permisos' => json_encode(isset($body['permisos']) ? permisosLimpios($body['permisos']) : json_decode($actual['permisos'], true)),
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
    $stmt = $pdo->prepare('SELECT rol FROM personal WHERE id = ?');
    $stmt->execute([$id]);
    $rolDestino = $stmt->fetchColumn();

    if ($rolDestino === 'SuperAdmin') {
        requireMandoSuperAdmin($auth);
        if (otrosSuperAdminsActivos($pdo, $id) === 0) {
            jsonError('Es el único Super Admin activo: asigná otro antes de eliminarlo', 409);
        }
    }

    $pdo->prepare('DELETE FROM personal WHERE id = ?')->execute([$id]);
    jsonSalida(['ok' => true]);
}
