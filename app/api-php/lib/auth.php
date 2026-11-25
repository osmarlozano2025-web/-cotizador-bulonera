<?php
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/db.php';

function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/'));
}

/** Cuánto dura una sesión. Más corto = menos tiempo útil para un token robado. */
const SESION_SEGUNDOS = 7 * 24 * 60 * 60;

/**
 * El secreto con el que se firman las sesiones. Si falta, se corta: firmar con
 * una clave vacía deja que cualquiera fabrique un token de administrador.
 */
function secretoJwt(): string
{
    $secreto = (require __DIR__ . '/../config.php')['jwt_secret'] ?? '';
    if (strlen($secreto) < 32) {
        error_log('SEGURIDAD: JWT_SECRET ausente o menor a 32 caracteres en el .env del servidor');
        if ($secreto === '') jsonError('El servidor no está configurado correctamente', 500);
    }
    return $secreto;
}

function firmarToken(array $usuario): string
{
    $header = base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64UrlEncode(json_encode([
        'id' => $usuario['id'],
        'rol' => $usuario['rol'],
        'iat' => time(),
        'exp' => time() + SESION_SEGUNDOS,
    ]));
    $firma = base64UrlEncode(hash_hmac('sha256', "$header.$payload", secretoJwt(), true));
    return "$header.$payload.$firma";
}

function verificarToken(string $token): ?array
{
    $partes = explode('.', $token);
    if (count($partes) !== 3) return null;
    [$header, $payload, $firma] = $partes;

    // Sólo HS256: un token que diga otro algoritmo (por ejemplo "none") se rechaza.
    $cabecera = json_decode(base64UrlDecode($header), true);
    if (!is_array($cabecera) || ($cabecera['alg'] ?? null) !== 'HS256') return null;

    $esperada = base64UrlEncode(hash_hmac('sha256', "$header.$payload", secretoJwt(), true));
    if (!hash_equals($esperada, $firma)) return null;

    $datos = json_decode(base64UrlDecode($payload), true);
    // Sin vencimiento el token valdría para siempre: tiene que traer `exp` y no estar vencido.
    if (!is_array($datos) || !isset($datos['exp']) || $datos['exp'] < time()) return null;
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

/**
 * Exige sesión y devuelve al usuario tal como está hoy en la base.
 *
 * El token dura treinta días y lleva el rol adentro. Si sólo se mirara el
 * token, dar de baja a alguien o bajarle el rol no tendría efecto hasta que
 * venciera: seguiría entrando un mes con los permisos viejos. Por eso se relee
 * el usuario en cada pedido — una consulta por request, cacheada.
 */
function requireAuth(): array
{
    static $cache = null;
    if ($cache !== null) return $cache;

    $auth = obtenerAuth();
    if (!$auth) jsonError('No autenticado', 401);

    // Los clientes ya no ingresan a la app: una sesión vieja de cliente no sirve.
    if (($auth['tipo'] ?? null) === 'cliente') jsonError('Los clientes ya no ingresan a la aplicación', 401);

    $stmt = obtenerPDO()->prepare('SELECT rol, permisos, activo FROM personal WHERE id = ?');
    $stmt->execute([$auth['id']]);
    $usuario = $stmt->fetch();

    if (!$usuario) jsonError('Tu usuario ya no existe', 401);
    if (!(int) $usuario['activo']) jsonError('Tu usuario está dado de baja', 401);

    $auth['rol'] = $usuario['rol'];
    $auth['permisos'] = json_decode($usuario['permisos'], true) ?: [];

    // Un usuario de sólo lectura entra a todas las pantallas y no cambia nada.
    // El corte va acá y no ruta por ruta a propósito: cualquier escritura pasa
    // primero por requireAuth(), así que ninguna ruta —ni las que se agreguen
    // mañana— puede olvidarse de preguntar. Todo lo que no sea GET se rebota.
    if (!empty($auth['permisos']['soloLectura']) && ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        jsonError('Tu usuario es de sólo lectura: podés ver todo, pero no modificar', 403);
    }

    return $cache = $auth;
}

function requireRole(array $auth, array $rolesPermitidos): void
{
    if (!in_array($auth['rol'], $rolesPermitidos, true)) {
        jsonError('No tenés permiso para esta acción', 403);
    }
}

/**
 * Los dos roles que mandan. Un SuperAdmin puede todo lo que puede un
 * Administrador; lo que suma es poder crear otros super admins y tocar las
 * cuentas que ya lo son. Se usa como lista en vez de escribir 'Administrador'
 * suelto, para que agregar un rol de mando no obligue a repasar cada ruta.
 */
const ROLES_ADMIN = ['SuperAdmin', 'Administrador'];

function esSuperAdmin(array $auth): bool
{
    return ($auth['rol'] ?? null) === 'SuperAdmin';
}

/**
 * Ve todo, no toca nada.
 *
 * Es un tilde sobre el usuario, no un rol aparte: el rol sigue diciendo hasta
 * dónde llega (qué pantallas, a quién puede editar) y esto sólo decide si
 * además puede escribir. Así no hay que duplicar cada rol en dos variantes.
 */
function esSoloLectura(array $auth): bool
{
    return !empty($auth['permisos']['soloLectura']);
}
