<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/mailer.php';

function sinPasswordPersonal(array $u): array
{
    unset($u['passwordHash']);
    unset($u['tokenVerificacion']);
    $u['permisos'] = json_decode($u['permisos'], true);
    $u['activo'] = (bool) $u['activo'];
    $u['emailVerificado'] = (bool) $u['emailVerificado'];
    return $u;
}

function sinPasswordCliente(array $c): array
{
    unset($c['passwordHash']);
    unset($c['tokenVerificacion']);
    $c['tipo'] = 'cliente';
    $c['clienteId'] = $c['id'];
    $c['nombre'] = $c['nombre'] ?? '';
    $c['rol'] = 'Cliente';
    $c['permisos'] = ['secciones' => ['nuevo-pedido'], 'puedeAprobarFamilias' => false, 'puedeEnviarCliente' => false];
    return $c;
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
    $identificador = trim($body['usuario'] ?? $body['email'] ?? '');
    $password = $body['password'] ?? '';

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM personal WHERE (usuario = ? OR email = ?) AND activo = 1');
    $stmt->execute([$identificador, $identificador]);
    $persona = $stmt->fetch();

    if (!$persona || !password_verify($password, $persona['passwordHash'])) {
        jsonError('Usuario o contraseña incorrectos', 401);
    }
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

    if (($auth['tipo'] ?? null) === 'cliente') {
        $pdo = obtenerPDO();
        $stmt = $pdo->prepare('SELECT * FROM clientes WHERE id = ?');
        $stmt->execute([$auth['clienteId']]);
        $cliente = $stmt->fetch();
        if (!$cliente) jsonError('Sesión inválida', 401);
        jsonSalida(sinPasswordCliente($cliente));
        return;
    }

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
    $nombre = trim($body['nombre'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$nombre || !$email || !$password) jsonError('Faltan datos obligatorios', 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('El email no es válido', 400);
    if (strlen($password) < 6) jsonError('La contraseña tiene que tener al menos 6 caracteres', 400);

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
        <p>Hola $nombre,</p>
        <p>Creaste una cuenta de personal en Córdoba Bulones. Confirmá tu email para poder ingresar:</p>
        <p><a href=\"$link\">Confirmar mi cuenta</a></p>
        <p>Un administrador te va a asignar los permisos una vez que confirmes.</p>
    ");

    jsonSalida(['ok' => true, 'mensaje' => 'Te mandamos un mail para confirmar tu cuenta.']);
}

function rutaAuthVerificarPersonal(string $token): void
{
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

// ---------- Clientes ----------

function rutaAuthRegistrarCliente(): void
{
    $body = cuerpoJson();
    $identificador = trim($body['identificador'] ?? '');
    $password = $body['password'] ?? '';

    if (!$identificador || !$password) jsonError('Faltan datos obligatorios', 400);
    if (strlen($password) < 6) jsonError('La contraseña tiene que tener al menos 6 caracteres', 400);

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM clientes WHERE email = ? OR cuit = ?');
    $stmt->execute([$identificador, $identificador]);
    $cliente = $stmt->fetch();

    if (!$cliente) jsonError('No encontramos ningún cliente con ese email o CUIT. Comunicate con nosotros.', 404);
    if ($cliente['passwordHash']) jsonError('Ese cliente ya tiene una cuenta. Iniciá sesión.', 409);
    if (!$cliente['email']) jsonError('Ese cliente no tiene un email cargado. Comunicate con nosotros para agregarlo.', 400);

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $token = generarTokenVerificacion();
    $pdo->prepare(
        'UPDATE clientes SET passwordHash = ?, emailVerificado = 0, tokenVerificacion = ?, tokenExpira = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = ?'
    )->execute([$hash, $token, $cliente['id']]);

    $link = linkVerificacion('cliente', $token);
    enviarMail($cliente['email'], 'Confirmá tu cuenta — Córdoba Bulones', "
        <p>Hola {$cliente['nombre']},</p>
        <p>Confirmá tu email para poder ingresar y hacer pedidos:</p>
        <p><a href=\"$link\">Confirmar mi cuenta</a></p>
    ");

    jsonSalida(['ok' => true, 'mensaje' => 'Te mandamos un mail para confirmar tu cuenta.']);
}

function rutaAuthVerificarCliente(string $token): void
{
    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT id, emailVerificado, tokenExpira FROM clientes WHERE tokenVerificacion = ?');
    $stmt->execute([$token]);
    $fila = $stmt->fetch();
    if (!$fila) jsonError('El link no es válido', 400);

    // Ídem personal: repetir la confirmación de un token ya usado debe ser un
    // no-op exitoso, no un error (ver rutaAuthVerificarPersonal).
    if (!(int) $fila['emailVerificado']) {
        if (strtotime($fila['tokenExpira']) < time()) jsonError('El link venció', 400);
        $pdo->prepare('UPDATE clientes SET emailVerificado = 1 WHERE id = ?')->execute([$fila['id']]);
    }
    jsonSalida(['ok' => true]);
}

function rutaAuthLoginCliente(): void
{
    $body = cuerpoJson();
    $identificador = trim($body['identificador'] ?? '');
    $password = $body['password'] ?? '';

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM clientes WHERE (email = ? OR cuit = ?) AND passwordHash IS NOT NULL');
    $stmt->execute([$identificador, $identificador]);
    $cliente = $stmt->fetch();

    if (!$cliente || !password_verify($password, $cliente['passwordHash'])) {
        jsonError('Usuario o contraseña incorrectos', 401);
    }
    if (!(int) $cliente['emailVerificado']) {
        jsonError('Todavía no confirmaste tu email. Revisá tu correo.', 403);
    }

    jsonSalida([
        'token' => firmarTokenCliente($cliente),
        'user' => sinPasswordCliente($cliente),
    ]);
}
