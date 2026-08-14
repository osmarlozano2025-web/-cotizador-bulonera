<?php
require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/personal.php';
require_once __DIR__ . '/routes/clientes.php';
require_once __DIR__ . '/routes/productos.php';
require_once __DIR__ . '/routes/aprobaciones.php';
require_once __DIR__ . '/routes/integraciones.php';
require_once __DIR__ . '/routes/configuraciones.php';

set_exception_handler(function ($e) {
    error_log($e->getMessage());
    jsonError('Error interno: ' . $e->getMessage(), 500);
});

$metodo = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$ruta = preg_replace('#^/api#', '', $uri);
$ruta = rtrim($ruta, '/');
if ($ruta === '') $ruta = '/';

// [método, patrón con :param, handler]
$rutas = [
    ['POST', '#^/auth/login$#', fn() => rutaAuthLogin()],
    ['GET',  '#^/auth/me$#', fn() => rutaAuthMe()],

    ['GET',    '#^/personal$#', fn() => rutaPersonalListar()],
    ['POST',   '#^/personal$#', fn() => rutaPersonalCrear()],
    ['PUT',    '#^/personal/([^/]+)$#', fn($id) => rutaPersonalActualizar($id)],
    ['DELETE', '#^/personal/([^/]+)$#', fn($id) => rutaPersonalEliminar($id)],

    ['GET', '#^/clientes/tipos-descuento$#', fn() => rutaTiposDescuento()],
    ['GET', '#^/clientes$#', fn() => rutaClientesListar()],
    ['GET', '#^/clientes/([^/]+)$#', fn($id) => rutaClientesObtener($id)],
    ['POST', '#^/clientes$#', fn() => rutaClientesCrear()],
    ['PUT', '#^/clientes/([^/]+)$#', fn($id) => rutaClientesActualizar($id)],
    ['DELETE', '#^/clientes/([^/]+)$#', fn($id) => rutaClientesEliminar($id)],

    ['GET', '#^/productos/buscar$#', fn() => rutaProductosBuscar()],
    ['GET', '#^/productos/familias$#', fn() => rutaProductosFamilias()],
    ['POST', '#^/productos/interpretar-imagen$#', fn() => rutaProductosInterpretarImagen()],

    ['POST', '#^/aprobaciones$#', fn() => rutaAprobacionesCrear()],
    ['GET', '#^/aprobaciones$#', fn() => rutaAprobacionesListar()],
    ['GET', '#^/aprobaciones/confirmar/([^/]+)$#', fn($t) => rutaAprobacionesConfirmarObtener($t)],
    ['POST', '#^/aprobaciones/confirmar/([^/]+)$#', fn($t) => rutaAprobacionesConfirmarPost($t)],
    ['POST', '#^/aprobaciones/([^/]+)/aprobar-familia$#', fn($id) => rutaAprobacionesAprobarFamilia($id)],
    ['POST', '#^/aprobaciones/([^/]+)/marcar-enviado$#', fn($id) => rutaAprobacionesMarcarEnviado($id)],
    ['GET', '#^/aprobaciones/([^/]+)$#', fn($id) => rutaAprobacionesObtener($id)],

    ['GET', '#^/integraciones$#', fn() => rutaIntegracionesObtener()],
    ['PUT', '#^/integraciones$#', fn() => rutaIntegracionesActualizar()],

    ['GET', '#^/configuraciones$#', fn() => rutaConfiguracionesObtener()],
    ['GET', '#^/configuraciones/admin$#', fn() => rutaConfiguracionesAdmin()],
    ['PUT', '#^/configuraciones/([^/]+)$#', fn($c) => rutaConfiguracionesActualizar($c)],
];

foreach ($rutas as [$metodoRuta, $patron, $handler]) {
    if ($metodo !== $metodoRuta) continue;
    if (preg_match($patron, $ruta, $coincidencias)) {
        array_shift($coincidencias);
        $handler(...$coincidencias);
        exit;
    }
}

jsonError('Ruta no encontrada', 404);
