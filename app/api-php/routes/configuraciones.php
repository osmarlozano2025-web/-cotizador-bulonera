<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/precios.php';
require_once __DIR__ . '/../lib/depositos.php';

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

/**
 * GET /api/configuraciones — reglas vigentes, para la gente de la casa.
 *
 * Pide sesión: acá están los topes de descuento de cada familia y quién es
 * responsable de cada depósito. La proforma que abre el cliente no la necesita,
 * porque el pedido ya viaja con los nombres que muestra.
 */
function rutaConfiguracionesObtener() {
    requireAuth();
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
    // Se leen con depositosConfigurados() y no de la clave cruda, para que esta
    // pantalla muestre lo mismo que usa el flujo de pedidos: ahí una familia
    // sin depósito se le asigna al primero, y acá tiene que verse igual.
    $depositos = [];
    foreach (depositosConfigurados($pdo) as $dep) {
        $resp = !empty($dep['responsableId']) ? ($personal[$dep['responsableId']] ?? null) : null;
        $dep['responsableNombre'] = $resp['nombre'] ?? null;
        $dep['responsableUsuario'] = $resp['usuario'] ?? null;
        $dep['familias'] = $dep['familias'] ?? [];
        $depositos[] = $dep;
    }
    usort($depositos, fn($a, $b) => ($a['numero'] ?? 99) <=> ($b['numero'] ?? 99));

    // Topes, condiciones de pago y familias salen del motor de precios, que es
    // el que manda. Si esta pantalla armara su propia lista, volvería a pasar
    // lo de antes: una familia visible acá que el cálculo no reconoce.
    $reglas = configDescuentos($pdo);
    $descuentos_familia = $reglas['topes'];
    $descuentos_pago = $reglas['pago'];
    $etiquetas_pago = $reglas['etiquetasPago'];

    $etiquetas_familia = [];
    $orden_familias = [];
    foreach (familiasConfiguradas($pdo) as $clave => $f) {
        $etiquetas_familia[$clave] = $f['nombre'];
        $orden_familias[$clave] = $f['orden'];
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
        // Las familias que existen, con su nombre y su orden. El cliente las
        // toma de acá en lugar de tener su propia copia.
        'etiquetas_familia' => $etiquetas_familia,
        'orden_familias' => $orden_familias,
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

    if (!in_array($rol, ROLES_ADMIN, true)) {
        jsonError('No tenés permiso para ver todas las configuraciones', 403);
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

    if (!in_array($rol, ROLES_ADMIN, true)) {
        jsonError('No tenés permiso para editar configuraciones', 403);
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

/**
 * Baja una condición de pago cargada por el usuario.
 *
 * Sólo las 'pago_*'. Las tres de fábrica las reconstruye configDescuentos()
 * desde PAGOS_DE_FABRICA en cada lectura, así que borrarles la fila no las
 * sacaría de la lista: volverían con valor 0. Y 'contado' además es el
 * fallback de condicionPagoValida(), o sea que sin ella no habría a qué caer.
 *
 * No borra la fila: la marca inactiva. El motor de precios lee con
 * 'activo = 1', así que desaparece igual, pero un borrado por error se
 * deshace, y volver a crear la misma condición la reactiva sola por el
 * ON DUPLICATE KEY UPDATE de rutaConfiguracionesActualizar().
 */
function rutaConfiguracionesEliminar($clave) {
    $auth = requireAuth();
    $rol = $auth['rol'] ?? null;

    if (!in_array($rol, ROLES_ADMIN, true)) {
        jsonError('No tenés permiso para editar configuraciones', 403);
        return;
    }

    if (strpos($clave, 'pago_') !== 0) {
        jsonError('Sólo se pueden eliminar las condiciones de pago que agregaste', 400);
        return;
    }

    $pdo = obtenerPDO();

    $stmt = $pdo->prepare('SELECT valor FROM configuraciones WHERE clave = ? AND activo = 1');
    $stmt->execute([$clave]);
    $fila = $stmt->fetchColumn();
    if ($fila === false) {
        jsonError('Esa condición de pago no existe', 404);
        return;
    }

    // La columna condicionPago de aprobaciones guarda la condición sin el
    // prefijo, igual que las claves de configDescuentos()['pago'].
    $condicion = substr($clave, strlen('pago_'));

    // Un pedido que todavía no cerró se vuelve a calcular cuando se confirman
    // sus renglones, y ahí condicionPagoValida() ya no reconocería la condición
    // borrada: pasaría a Contado y cambiaría el precio a mitad de camino.
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM aprobaciones
        WHERE condicionPago = ? AND estado <> 'confirmado'
    ");
    $stmt->execute([$condicion]);
    $enCurso = (int) $stmt->fetchColumn();

    if ($enCurso > 0) {
        jsonError(
            $enCurso === 1
                ? 'Hay 1 pedido en curso con esta condición: cerralo antes de eliminarla'
                : "Hay $enCurso pedidos en curso con esta condición: cerralos antes de eliminarla",
            409,
        );
        return;
    }

    $pdo->prepare('UPDATE configuraciones SET activo = 0, editado_por = ? WHERE clave = ?')
        ->execute([$auth['id'], $clave]);

    global $config_cache, $cache_time;
    $config_cache = [];
    $cache_time = 0;

    jsonSalida([
        'ok' => true,
        'mensaje' => 'Condición de pago eliminada',
        'clave' => $clave,
    ]);
}
