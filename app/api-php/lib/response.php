<?php

function jsonSalida($datos, int $status = 200): void
{
    // Todo acceso rechazado queda anotado: es lo que permite ver un ataque en curso.
    if (in_array($status, [401, 403], true) && function_exists('registrarSeguridad')) {
        $mensaje = is_array($datos) ? ($datos['error'] ?? '') : '';
        registrarSeguridad('acceso_denegado', ['estado' => $status, 'motivo' => substr((string) $mensaje, 0, 120)]);
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $mensaje, int $status = 400): void
{
    jsonSalida(['error' => $mensaje], $status);
}

/** Cuerpo JSON del pedido. Si no es un objeto/lista válido, queda vacío y la ruta lo rechaza por faltante. */
function cuerpoJson(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 1024 * 1024 + 1);
    if ($raw !== false && strlen($raw) > 1024 * 1024) jsonError('El pedido es demasiado grande', 413);
    $data = json_decode((string) $raw, true);
    return is_array($data) ? $data : [];
}
