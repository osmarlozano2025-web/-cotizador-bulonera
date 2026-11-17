<?php
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/seguridad.php';

/**
 * GET /api/seguridad/eventos — lo último que el registro de seguridad anotó:
 * logins fallidos, bloqueos por exceso de intentos, accesos rechazados y
 * pedidos de orígenes ajenos. Sólo administradores.
 *
 *   ?limite=100   cuántos eventos (máximo 500)
 *   ?tipo=login_fallido   filtra por tipo
 */
function rutaSeguridadEventos(): void
{
    $auth = requireAuth();
    requireRole($auth, ROLES_ADMIN);

    $limite = min(max((int) ($_GET['limite'] ?? 100), 1), 500);
    $tipo = (string) ($_GET['tipo'] ?? '');

    $eventos = [];
    // Este mes y, si no alcanza, el anterior.
    foreach ([date('Y-m'), date('Y-m', strtotime('first day of last month'))] as $mes) {
        $archivo = SEGURIDAD_DIR_LOGS . "/seguridad-$mes.log";
        if (!is_file($archivo)) continue;
        $lineas = array_reverse(file($archivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []);
        foreach ($lineas as $linea) {
            $e = json_decode($linea, true);
            if (!is_array($e)) continue;
            if ($tipo !== '' && ($e['tipo'] ?? '') !== $tipo) continue;
            $eventos[] = $e;
            if (count($eventos) >= $limite) break 2;
        }
    }

    jsonSalida($eventos);
}
