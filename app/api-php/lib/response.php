<?php

function jsonSalida($datos, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $mensaje, int $status = 400): void
{
    jsonSalida(['error' => $mensaje], $status);
}

function cuerpoJson(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
