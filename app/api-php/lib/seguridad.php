<?php
/**
 * Defensas de la API que no dependen de ninguna ruta en particular:
 * cabeceras de seguridad, HTTPS, origen de los pedidos, límite de peticiones,
 * registro de actividad sospechosa y reglas de contraseña.
 *
 * No usa la base de datos a propósito: si la base cae o está bajo ataque, estas
 * defensas siguen funcionando. Los contadores y el registro viven en archivos
 * dentro de api-php/storage y api-php/logs (ambas carpetas cerradas por web).
 */

require_once __DIR__ . '/response.php';

const SEGURIDAD_DIR_LIMITES =__DIR__ . '/../storage/limites';
const SEGURIDAD_DIR_LOGS = __DIR__ . '/../logs';
const JSON_MAX_BYTES = 1024 * 1024; // 1 MB: ningún pedido legítimo se acerca

/** IP del que llama. Detrás del CDN de Hostinger la real viaja en X-Forwarded-For. */
function ipCliente(): string
{
    $reenviada = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($reenviada !== '') {
        $primera = trim(explode(',', $reenviada)[0]);
        if (filter_var($primera, FILTER_VALIDATE_IP)) return $primera;
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function esLocal(): bool
{
    $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    return in_array($host, ['localhost', '127.0.0.1', '[::1]'], true) || str_ends_with($host, '.localhost');
}

/** Crea una carpeta privada con un .htaccess que la cierra, si todavía no existe. */
function carpetaPrivada(string $dir): bool
{
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) return false;
    $cierre = $dir . '/.htaccess';
    if (!file_exists($cierre)) @file_put_contents($cierre, "Require all denied\n");
    return is_writable($dir);
}

/**
 * Anota un hecho de seguridad: una línea JSON por evento, un archivo por mes.
 * Nunca recibe contraseñas ni tokens: sólo qué pasó, desde dónde y contra qué.
 */
function registrarSeguridad(string $tipo, array $datos = []): void
{
    $linea = json_encode([
        'fecha' => date('c'),
        'tipo' => $tipo,
        'ip' => ipCliente(),
        'metodo' => $_SERVER['REQUEST_METHOD'] ?? '?',
        'ruta' => substr(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '', 0, 200),
        'agente' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 160),
        'datos' => $datos,
    ], JSON_UNESCAPED_UNICODE) . "\n";

    error_log("[seguridad] $linea");
    if (carpetaPrivada(SEGURIDAD_DIR_LOGS)) {
        @file_put_contents(SEGURIDAD_DIR_LOGS . '/seguridad-' . date('Y-m') . '.log', $linea, FILE_APPEND | LOCK_EX);
    }
}

/**
 * Cuenta un intento contra `$clave` y dice si todavía está dentro del límite.
 * Ventana fija: a los `$ventana` segundos del primer intento el contador se reinicia.
 *
 * @return int 0 si pasa; si no, los segundos que faltan para poder reintentar.
 */
function consumirIntento(string $clave, int $max, int $ventana): int
{
    if (!carpetaPrivada(SEGURIDAD_DIR_LIMITES)) return 0; // sin dónde contar, no se bloquea a nadie

    $archivo = SEGURIDAD_DIR_LIMITES . '/' . hash('sha256', $clave) . '.json';
    $f = @fopen($archivo, 'c+');
    if (!$f) return 0;

    flock($f, LOCK_EX);
    $estado = json_decode(stream_get_contents($f) ?: '', true);
    $ahora = time();
    if (!is_array($estado) || ($ahora - ($estado['desde'] ?? 0)) >= $ventana) {
        $estado = ['n' => 0, 'desde' => $ahora];
    }
    $estado['n']++;

    ftruncate($f, 0);
    rewind($f);
    fwrite($f, json_encode($estado));
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);

    // De vez en cuando se barren los contadores viejos para que la carpeta no crezca.
    if (random_int(1, 200) === 1) {
        foreach (glob(SEGURIDAD_DIR_LIMITES . '/*.json') ?: [] as $viejo) {
            if (@filemtime($viejo) < $ahora - 86400) @unlink($viejo);
        }
    }

    return $estado['n'] > $max ? max(1, $ventana - ($ahora - $estado['desde'])) : 0;
}

/** Corta con 429 si `$clave` pasó el límite. */
function limitar(string $clave, int $max, int $ventana, string $motivo): void
{
    $espera = consumirIntento($clave, $max, $ventana);
    if ($espera > 0) {
        registrarSeguridad('limite_superado', ['motivo' => $motivo]);
        header('Retry-After: ' . $espera);
        jsonError('Demasiados intentos. Esperá ' . ceil($espera / 60) . ' minuto(s) y volvé a probar.', 429);
    }
}

/** Mira cuántos intentos van sin gastar uno. Sirve para los logins fallidos. */
function intentosRestantes(string $clave, int $max, int $ventana): bool
{
    if (!is_dir(SEGURIDAD_DIR_LIMITES)) return true;
    $archivo = SEGURIDAD_DIR_LIMITES . '/' . hash('sha256', $clave) . '.json';
    $estado = is_file($archivo) ? json_decode((string) @file_get_contents($archivo), true) : null;
    if (!is_array($estado) || (time() - ($estado['desde'] ?? 0)) >= $ventana) return true;
    return ($estado['n'] ?? 0) < $max;
}

function olvidarIntentos(string $clave): void
{
    @unlink(SEGURIDAD_DIR_LIMITES . '/' . hash('sha256', $clave) . '.json');
}

/** Reglas de contraseña. Devuelve el motivo del rechazo, o null si sirve. */
function motivoPasswordDebil(string $password, string ...$noUsar): ?string
{
    if (strlen($password) < 8) return 'La contraseña tiene que tener al menos 8 caracteres';
    // bcrypt ignora lo que pasa de 72 bytes: mejor avisar que aceptarlo en silencio.
    if (strlen($password) > 72) return 'La contraseña no puede pasar de 72 caracteres';
    $minuscula = mb_strtolower($password);
    foreach ($noUsar as $dato) {
        if ($dato !== '' && $minuscula === mb_strtolower($dato)) return 'La contraseña no puede ser igual al usuario o al email';
    }
    $comunes = ['12345678', '123456789', '1234567890', 'password', 'contraseña', 'qwertyui', 'abcd1234', '11111111', 'admin123', 'vendedor123', 'deposito123'];
    if (in_array($minuscula, $comunes, true)) return 'Esa contraseña es demasiado común: elegí otra';
    if (count(array_unique(mb_str_split($password))) < 4) return 'La contraseña es demasiado repetitiva';
    return null;
}

/** Texto de usuario que va a terminar dentro de un mail HTML. */
function h(?string $texto): string
{
    return htmlspecialchars((string) $texto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Se llama una vez, al principio de cada pedido a la API.
 */
function iniciarSeguridad(): void
{
    // Nada de modo depuración en producción: los errores van al registro, no a la pantalla.
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
    error_reporting(E_ALL);
    header_remove('X-Powered-By');

    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    header('Cross-Origin-Resource-Policy: same-origin');
    header('Cache-Control: no-store');

    $local = esLocal();
    $reenviado = strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $reenviado === 'https';

    if (!$local) {
        // Sólo se considera inseguro cuando hay una señal clara: así un hosting
        // que no informe el protocolo no se queda en un bucle de redirecciones.
        $claramenteHttp = $reenviado === 'http'
            || ($reenviado === '' && empty($_SERVER['HTTPS']) && (int) ($_SERVER['SERVER_PORT'] ?? 0) === 80);
        if ($claramenteHttp) {
            registrarSeguridad('http_sin_cifrar');
            if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
                header('Location: https://' . ($_SERVER['HTTP_HOST'] ?? '') . ($_SERVER['REQUEST_URI'] ?? '/'), true, 301);
                exit;
            }
            http_response_code(403);
            exit('Usá https://');
        }
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }

    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // El navegador ya impide leer respuestas de otro origen (la API no manda
    // cabeceras CORS). Esto además rechaza los pedidos que cambian datos y
    // vienen de una página ajena, sin esperar a que el navegador opine.
    if (!in_array($metodo, ['GET', 'HEAD', 'OPTIONS'], true)) {
        $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origen !== '' && !origenPermitido($origen)) {
            registrarSeguridad('origen_no_permitido', ['origen' => substr($origen, 0, 120)]);
            jsonError('Origen no permitido', 403);
        }
    }
    if ($metodo === 'OPTIONS') {
        // No hay CORS: no se anuncia ningún origen permitido.
        http_response_code(204);
        exit;
    }

    // Los pedidos con cuerpo JSON son chicos. La foto del pedido es la excepción (multipart).
    $largo = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    $esFoto = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
    if (!$esFoto && $largo > JSON_MAX_BYTES) {
        registrarSeguridad('cuerpo_demasiado_grande', ['bytes' => $largo]);
        jsonError('El pedido es demasiado grande', 413);
    }

    // Freno general: un solo origen no debería poder saturar la API.
    limitar('general:' . ipCliente(), 600, 60, 'general');
}

function origenPermitido(string $origen): bool
{
    $cfg = require __DIR__ . '/../config.php';
    $host = strtolower((string) parse_url($origen, PHP_URL_HOST));
    $puerto = parse_url($origen, PHP_URL_PORT);
    $propio = strtolower($_SERVER['HTTP_HOST'] ?? '');
    $comparable = $host . ($puerto ? ":$puerto" : '');
    if ($comparable === $propio || $host === preg_replace('/:\d+$/', '', $propio)) return true;

    $front = strtolower((string) parse_url($cfg['frontend_url'], PHP_URL_HOST));
    return $front !== '' && $host === $front;
}
