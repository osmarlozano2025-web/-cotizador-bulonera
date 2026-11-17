<?php
/**
 * Pruebas de las defensas de seguridad que no necesitan base de datos.
 *
 *   npm run test:seguridad        (desde app/)
 *   php api-php/tests/seguridad-test.php
 */
putenv('JWT_SECRET=' . str_repeat('k', 48));
$_SERVER['REMOTE_ADDR'] = '203.0.113.7';
$_SERVER['REQUEST_METHOD'] = 'POST';

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/seguridad.php';

$fallos = 0;
function verificar(string $nombre, bool $ok): void
{
    global $fallos;
    echo ($ok ? '  ok   ' : '  FALLA ') . $nombre . "\n";
    if (!$ok) $fallos++;
}

echo "Contraseñas\n";
verificar('corta (<8) se rechaza', motivoPasswordDebil('abc123') !== null);
verificar('muy común se rechaza', motivoPasswordDebil('12345678') !== null);
verificar('igual al usuario se rechaza', motivoPasswordDebil('maria.perez', 'maria.perez') !== null);
verificar('repetitiva se rechaza', motivoPasswordDebil('aaaaaaaaaa') !== null);
verificar('más de 72 bytes se rechaza (bcrypt las recorta)', motivoPasswordDebil(str_repeat('ab12', 20)) !== null);
verificar('una buena se acepta', motivoPasswordDebil('Torn1llo-Largo-2026') === null);

echo "Sesiones (JWT)\n";
$token = firmarToken(['id' => '7', 'rol' => 'Vendedor']);
verificar('un token propio vale', (verificarToken($token)['id'] ?? null) === '7');

[$h, $p, $f] = explode('.', $token);
verificar('firma alterada se rechaza', verificarToken("$h.$p." . strrev($f)) === null);

$payloadAdmin = base64UrlEncode(json_encode(['id' => '7', 'rol' => 'SuperAdmin', 'exp' => time() + 999]));
verificar('payload cambiado con la firma vieja se rechaza', verificarToken("$h.$payloadAdmin.$f") === null);

$sinFirma = base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'none'])) . ".$p.";
verificar('alg=none se rechaza', verificarToken($sinFirma) === null);

$secreto = str_repeat('k', 48);
$hdr = base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
$vencido = base64UrlEncode(json_encode(['id' => '7', 'exp' => time() - 10]));
verificar('token vencido se rechaza', verificarToken("$hdr.$vencido." . base64UrlEncode(hash_hmac('sha256', "$hdr.$vencido", $secreto, true))) === null);
$eterno = base64UrlEncode(json_encode(['id' => '7']));
verificar('token sin vencimiento se rechaza', verificarToken("$hdr.$eterno." . base64UrlEncode(hash_hmac('sha256', "$hdr.$eterno", $secreto, true))) === null);
verificar('basura se rechaza', verificarToken('no.es.token') === null && verificarToken('') === null);

$datos = json_decode(base64UrlDecode($p), true);
verificar('la sesión dura 7 días como máximo', ($datos['exp'] - time()) <= SESION_SEGUNDOS && SESION_SEGUNDOS === 604800);

echo "Límite de intentos\n";
$clave = 'prueba:' . bin2hex(random_bytes(6));
$resultados = [];
for ($i = 1; $i <= 6; $i++) $resultados[] = consumirIntento($clave, 5, 60);
verificar('los primeros 5 pasan', array_sum(array_slice($resultados, 0, 5)) === 0);
verificar('el 6.º se bloquea', $resultados[5] > 0);
verificar('intentosRestantes lo ve agotado', intentosRestantes($clave, 5, 60) === false);
olvidarIntentos($clave);
verificar('olvidarIntentos lo libera', intentosRestantes($clave, 5, 60) === true);

echo "Mails\n";
verificar('h() neutraliza HTML', h('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;');

echo $fallos ? "\n$fallos prueba(s) fallaron\n" : "\nTodo bien\n";
exit($fallos ? 1 : 0);
