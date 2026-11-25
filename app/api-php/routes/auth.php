<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/mailer.php';
require_once __DIR__ . '/../lib/seguridad.php';

/** Hash de una clave que nadie conoce: se verifica contra él cuando la cuenta no existe, para que tardar lo mismo no delate qué usuarios hay. */
const HASH_SENUELO = '$2y$10$tWUFaIdq2swU9kDEhgdDQuXPd3cO07KRMBoekxqxw3ejw9oR3RUoO';

const LOGIN_MAX_POR_USUARIO = 8; // fallos seguidos contra una misma cuenta
const LOGIN_MAX_POR_IP = 30;     // fallos seguidos desde un mismo origen
const LOGIN_VENTANA = 900;       // 15 minutos

/** Corta antes de mirar la contraseña si esa cuenta o ese origen ya agotaron sus intentos. */
function exigirLoginPermitido(string $identificador): void
{
    $claveUsuario = 'login:u:' . mb_strtolower($identificador);
    $claveIp = 'login:ip:' . ipCliente();
    if (!intentosRestantes($claveUsuario, LOGIN_MAX_POR_USUARIO, LOGIN_VENTANA)
        || !intentosRestantes($claveIp, LOGIN_MAX_POR_IP, LOGIN_VENTANA)) {
        registrarSeguridad('login_bloqueado', ['usuario' => mb_substr($identificador, 0, 80)]);
        header('Retry-After: ' . LOGIN_VENTANA);
        jsonError('Demasiados intentos fallidos. Esperá 15 minutos y volvé a probar.', 429);
    }
}

function anotarLoginFallido(string $identificador, string $tipo): void
{
    consumirIntento('login:u:' . mb_strtolower($identificador), LOGIN_MAX_POR_USUARIO, LOGIN_VENTANA);
    consumirIntento('login:ip:' . ipCliente(), LOGIN_MAX_POR_IP, LOGIN_VENTANA);
    registrarSeguridad('login_fallido', ['usuario' => mb_substr($identificador, 0, 80), 'tipo' => $tipo]);
}

/** Verifica la contraseña tardando lo mismo exista o no la cuenta. */
function claveCorrecta(string $password, ?string $hash): bool
{
    $ok = password_verify($password, $hash ?: HASH_SENUELO);
    return $ok && $hash !== null && $hash !== '';
}

function sinPasswordPersonal(array $u): array
{
    unset($u['passwordHash']);
    unset($u['tokenVerificacion']);
    $u['permisos'] = json_decode($u['permisos'], true);
    $u['activo'] = (bool) $u['activo'];
    $u['emailVerificado'] = (bool) $u['emailVerificado'];
    return $u;
}

function generarTokenVerificacion(): string
{
    return bin2hex(random_bytes(32));
}

function linkVerificacion(string $tipo, string $token): string
{
    $cfg = require __DIR__ . '/../config.php';
    return rtrim($cfg['frontend_url'], '/') . "/verificar-email/$tipo/$token";
}

// ---------- Personal ----------

function rutaAuthLogin(): void
{
    $body = cuerpoJson();
    $identificador = mb_substr(trim((string) ($body['usuario'] ?? $body['email'] ?? '')), 0, 150);
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';

    exigirLoginPermitido($identificador);

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM personal WHERE (usuario = ? OR email = ?) AND activo = 1');
    $stmt->execute([$identificador, $identificador]);
    $persona = $stmt->fetch();

    if (!claveCorrecta($password, $persona['passwordHash'] ?? null)) {
        anotarLoginFallido($identificador, 'personal');
        jsonError('Usuario o contraseña incorrectos', 401);
    }
    olvidarIntentos('login:u:' . mb_strtolower($identificador));
    // La cuenta admin sembrada a mano no tiene email cargado: no le exigimos verificación.
    if ($persona['email'] && !(int) $persona['emailVerificado']) {
        jsonError('Todavía no confirmaste tu email. Revisá tu correo.', 403);
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

function rutaAuthRegistrarPersonal(): void
{
    $body = cuerpoJson();
    // Cinco altas por hora y por origen: alcanza para una persona y frena el alta masiva.
    limitar('registro:' . ipCliente(), 5, 3600, 'registro');

    $nombre = mb_substr(trim((string) ($body['nombre'] ?? '')), 0, 100);
    $email = mb_substr(trim((string) ($body['email'] ?? '')), 0, 150);
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';

    if (!$nombre || !$email || !$password) jsonError('Faltan datos obligatorios', 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('El email no es válido', 400);
    if ($motivo = motivoPasswordDebil($password, $email, $nombre)) jsonError($motivo, 400);

    $pdo = obtenerPDO();
    $existe = $pdo->prepare('SELECT id FROM personal WHERE email = ?');
    $existe->execute([$email]);
    if ($existe->fetch()) jsonError('Ya hay una cuenta registrada con ese email', 409);

    $id = (string) round(microtime(true) * 1000);
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $token = generarTokenVerificacion();
    // Arranca sin ninguna sección visible: el superadmin le asigna el rol después.
    $permisos = json_encode(['secciones' => [], 'puedeAprobarFamilias' => false, 'puedeEnviarCliente' => false]);

    $stmt = $pdo->prepare(
        'INSERT INTO personal (id, nombre, usuario, passwordHash, rol, permisos, activo, email, emailVerificado, tokenVerificacion, tokenExpira)
         VALUES (?, ?, NULL, ?, ?, ?, 1, ?, 0, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))'
    );
    $stmt->execute([$id, $nombre, $hash, 'Pendiente', $permisos, $email, $token]);

    $link = linkVerificacion('personal', $token);
    enviarMail($email, 'Confirmá tu cuenta — Córdoba Bulones', "
        <p>Hola " . h($nombre) . ",</p>
        <p>Creaste una cuenta de personal en Córdoba Bulones. Confirmá tu email para poder ingresar:</p>
        <p><a href=\"$link\">Confirmar mi cuenta</a></p>
        <p>Un administrador te va a asignar los permisos una vez que confirmes.</p>
        <p style=\"color:#666;font-size:12px\">El link vence en 24 horas. Si no creaste esta cuenta, ignorá este mail.</p>
    ");

    jsonSalida(['ok' => true, 'mensaje' => 'Te mandamos un mail para confirmar tu cuenta.']);
}

function rutaAuthVerificarPersonal(string $token): void
{
    limitar('verificar:' . ipCliente(), 30, 600, 'verificar');
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) jsonError('El link no es válido', 400);
    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT id, emailVerificado, tokenExpira FROM personal WHERE tokenVerificacion = ?');
    $stmt->execute([$token]);
    $fila = $stmt->fetch();
    if (!$fila) jsonError('El link no es válido', 400);

    // Ya estaba confirmado: repetir la confirmación no debe fallar. Algunos
    // clientes de mail visitan el link solos para escanearlo antes de que el
    // usuario haga click, y React en desarrollo puede disparar el efecto dos
    // veces — sin esto, la segunda visita real encontraría el link "roto".
    if (!(int) $fila['emailVerificado']) {
        if (strtotime($fila['tokenExpira']) < time()) jsonError('El link venció', 400);
        $pdo->prepare('UPDATE personal SET emailVerificado = 1 WHERE id = ?')->execute([$fila['id']]);
    }
    jsonSalida(['ok' => true]);
}


