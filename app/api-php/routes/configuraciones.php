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

    // Los depósitos son una lista: cada uno agrupa las familias que despacha.
    // Son dos (general y Tolsen), pero la estructura no fija la cantidad: mover
    // una familia de depósito, o agregar uno nuevo, es editar esta configuración.
    $depositos = [];
    foreach ($config['depositos'] ?? [] as $dep) {
        $resp = !empty($dep['responsableId']) ? ($personal[$dep['responsableId']] ?? null) : null;
        $dep['responsableNombre'] = $resp['nombre'] ?? null;
        $dep['responsableUsuario'] = $resp['usuario'] ?? null;
        $dep['familias'] = $dep['familias'] ?? [];
        $depositos[] = $dep;
    }
    usort($depositos, fn($a, $b) => ($a['numero'] ?? 99) <=> ($b['numero'] ?? 99));

    // Familias conocidas
    $familias = ['buloneria', 'tolsen', 'mechas', 'electrodos', 'escaleras', 'cintas_metricas'];

    $descuentos_familia = [];
    foreach ($familias as $fam) {
        $descuentos_familia[$fam] = (float) ($config["descuento_$fam"]['limite'] ?? 0);
    }

    // Condiciones de pago. Las tres de siempre viven en 'descuento_*' desde la
    // primera versión; las que carga el usuario se guardan como 'pago_*'.
    // Cada una lleva su nombre escrito a mano, porque el cliente lo muestra tal cual.
    $descuentos_pago = [
        'contado' => (float) ($config['descuento_contado']['valor'] ?? 0),
        '30dias'  => (float) ($config['descuento_30dias']['valor']  ?? 0),
        '60dias'  => (float) ($config['descuento_60dias']['valor']  ?? 0),
    ];
    $etiquetas_pago = [
        'contado' => 'Contado',
        '30dias'  => '30 días',
        '60dias'  => '60 días',
    ];

    foreach ($config as $clave => $valor) {
        if (strpos($clave, 'pago_') === 0) {
            $nombre = substr($clave, strlen('pago_'));
            $descuentos_pago[$nombre] = (float) ($valor['valor'] ?? 0);
            $etiquetas_pago[$nombre] = $valor['nombre'] ?? $nombre;
        }
    }

    jsonSalida([
        'depositos' => $depositos,
        // Un solo valor por familia: el tope de descuento que se puede dar en
        // el pedido. Negativo descuenta, positivo aumenta.
        'descuentos_familia' => $descuentos_familia,
        // Un solo valor con signo por condición: negativo descuenta, positivo aumenta.
        'descuentos_pago' => $descuentos_pago,
        // Cómo se escribe cada condición de pago en pantalla.
        'etiquetas_pago' => $etiquetas_pago,
        'stock' => [
            'tiempo_reserva_minutos' => $config['tiempo_reserva_stock']['minutos'] ?? 30,
            'cache_ttl_segundos' => $config['cache_stock_ttl']['segundos'] ?? 300,
        ],
        // Rango global dentro del cual se pueden mover los topes por familia.
        'rango_descuento' => [
            'min' => (float) ($config['rango_descuento']['min'] ?? -50),
            'max' => (float) ($config['rango_descuento']['max'] ?? 50),
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

    // Se inserta o se pisa: una condición de pago nueva todavía no tiene fila,
    // y un UPDATE a secas no guardaría nada ni avisaría del problema.
    $tipo = strpos($clave, 'pago_') === 0 ? 'descuento_pago' : 'descuento_familia';

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('
        INSERT INTO configuraciones (clave, valor, descripcion, tipo, editado_por, activo)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            valor = VALUES(valor),
            descripcion = COALESCE(VALUES(descripcion), descripcion),
            editado_por = VALUES(editado_por),
            activo = 1
    ');

    $ok = $stmt->execute([
        $clave,
        json_encode($valor),
        $descripcion,
        $tipo,
        $auth['id'],
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
