<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';

// Caché en memoria global
$config_cache = [];
$cache_time = 0;

function cargarConfiguracion() {
    global $config_cache, $cache_time;

    // Si caché aún es válido (< 5 min), usar caché
    if (time() - $cache_time < 300 && !empty($config_cache)) {
        return $config_cache;
    }

    // Si no, cargar de BD
    $pdo = obtenerPDO();
    $stmt = $pdo->query('SELECT clave, valor FROM configuraciones WHERE activo = 1');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $config = [];
    foreach ($rows as $row) {
        $config[$row['clave']] = json_decode($row['valor'], true);
    }

    $config_cache = $config;
    $cache_time = time();

    return $config;
}

// GET /api/configuraciones (público, caché)
function rutaConfiguracionesObtener() {
    $config = cargarConfiguracion();

    // Depósitos con el nombre del responsable resuelto desde personal
    $pdo = obtenerPDO();
    $personal = [];
    foreach ($pdo->query('SELECT id, nombre, usuario FROM personal WHERE activo = 1')->fetchAll(PDO::FETCH_ASSOC) as $p) {
        $personal[$p['id']] = $p;
    }

    $depositos = [];
    foreach (['buloneria', 'tolsen', 'mechas', 'electrodos'] as $fam) {
        $dep = $config["deposito_$fam"] ?? null;
        if (!$dep) continue;
        $resp = $dep['responsableId'] ? ($personal[$dep['responsableId']] ?? null) : null;
        $dep['responsableNombre'] = $resp['nombre'] ?? null;
        $dep['responsableUsuario'] = $resp['usuario'] ?? null;
        $depositos[$fam] = $dep;
    }

    jsonSalida([
        'depositos' => $depositos,
        'descuentos_familia' => [
            'buloneria' => $config['descuento_buloneria'] ?? ['desc_1' => 25, 'desc_2' => 0],
            'tolsen' => $config['descuento_tolsen'] ?? ['desc_1' => 55, 'desc_2' => 18],
            'mechas' => $config['descuento_mechas'] ?? ['desc_1' => 55, 'desc_2' => 18],
            'electrodos' => $config['descuento_electrodos'] ?? ['desc_1' => 0, 'desc_2' => 0],
        ],
        'descuentos_pago' => [
            'contado' => $config['descuento_contado'] ?? ['desc_1' => 0, 'desc_2' => 0],
            '30dias' => $config['descuento_30dias'] ?? ['desc_1' => 5, 'desc_2' => 0],
            '60dias' => $config['descuento_60dias'] ?? ['desc_1' => 0, 'desc_2' => 0],
        ],
        'stock' => [
            'tiempo_reserva_minutos' => $config['tiempo_reserva_stock']['minutos'] ?? 30,
            'cache_ttl_segundos' => $config['cache_stock_ttl']['segundos'] ?? 300,
        ],
    ]);
}

// GET /api/configuraciones/admin (solo admin, para editar)
function rutaConfiguracionesAdmin() {
    $auth = requireAuth();
    $rol = $auth['rol'] ?? null;

    if ($rol !== 'Administrador') {
        jsonError('Solo administradores pueden ver todas las configuraciones', 403);
        return;
    }

    $pdo = obtenerPDO();
    $stmt = $pdo->query('
        SELECT id, clave, valor, descripcion, tipo, editado_por, fecha_modificacion
        FROM configuraciones
        ORDER BY tipo, clave
    ');
    $todas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $agrupadas = [];
    foreach ($todas as $cfg) {
        $tipo = $cfg['tipo'];
        if (!isset($agrupadas[$tipo])) {
            $agrupadas[$tipo] = [];
        }
        $agrupadas[$tipo][] = [
            'id' => $cfg['id'],
            'clave' => $cfg['clave'],
            'valor' => json_decode($cfg['valor'], true),
            'descripcion' => $cfg['descripcion'],
            'editado_por_id' => $cfg['editado_por'],
            'fecha_modificacion' => $cfg['fecha_modificacion'],
        ];
    }

    jsonSalida($agrupadas);
}

// PUT /api/configuraciones/:clave (solo admin)
function rutaConfiguracionesActualizar($clave) {
    $auth = requireAuth();
    $rol = $auth['rol'] ?? null;

    if ($rol !== 'Administrador') {
        jsonError('Solo administradores pueden editar configuraciones', 403);
        return;
    }

    $body = cuerpoJson();
    $valor = $body['valor'] ?? null;
    $descripcion = $body['descripcion'] ?? null;

    if (!$valor) {
        jsonError('valor requerido', 400);
        return;
    }

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('
        UPDATE configuraciones
        SET valor = ?, descripcion = ?, editado_por = ?
        WHERE clave = ?
    ');

    $ok = $stmt->execute([
        json_encode($valor),
        $descripcion,
        $auth['id'],
        $clave
    ]);

    if (!$ok) {
        jsonError('Error al actualizar configuración', 500);
        return;
    }

    // Limpiar caché
    global $config_cache, $cache_time;
    $config_cache = [];
    $cache_time = 0;

    jsonSalida([
        'ok' => true,
        'mensaje' => 'Configuración actualizada',
        'clave' => $clave,
    ]);
}
