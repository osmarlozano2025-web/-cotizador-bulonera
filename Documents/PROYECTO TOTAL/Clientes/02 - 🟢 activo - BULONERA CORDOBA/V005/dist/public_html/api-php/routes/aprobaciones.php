<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/precios.php';

const FAMILIAS_VALIDAS = ['buloneria', 'tolsen', 'mechas', 'electrodos'];

/**
 * Deja constancia de todo lo que le pasa a un pedido: quién, cuándo y qué.
 * Nunca corta el flujo — si el log falla, la operación igual se completa.
 */
function registrarEvento(
    PDO $pdo,
    string $aprobacionId,
    string $evento,
    array $datos = []
): void {
    try {
        $pdo->prepare(
            'INSERT INTO pedidos_log
             (aprobacionId, evento, estadoAnterior, estadoNuevo, itemId, usuarioId, usuarioNombre, detalle)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $aprobacionId,
            $evento,
            $datos['estadoAnterior'] ?? null,
            $datos['estadoNuevo'] ?? null,
            $datos['itemId'] ?? null,
            $datos['usuarioId'] ?? null,
            $datos['usuarioNombre'] ?? null,
            $datos['detalle'] ?? null,
        ]);
    } catch (Throwable $e) {
        error_log('pedidos_log: ' . $e->getMessage());
    }
}

/** Nombre de la persona, para que el log se lea sin tener que cruzar tablas. */
function nombreUsuario(PDO $pdo, ?string $usuarioId): ?string
{
    if (!$usuarioId) return null;
    $stmt = $pdo->prepare('SELECT nombre FROM personal WHERE id = ?');
    $stmt->execute([$usuarioId]);
    return $stmt->fetchColumn() ?: null;
}

/** Orden de los depósitos: 1 Bulonería, 2 Tolsen, 3 Mechas, 4 Electrodos. */
const ORDEN_FAMILIAS = ['buloneria' => 1, 'tolsen' => 2, 'mechas' => 3, 'electrodos' => 4, 'otros' => 9];

function agruparPorFamilia(array $items): array
{
    $grupos = [];
    foreach ($items as $item) {
        $fam = in_array($item['familia'] ?? null, FAMILIAS_VALIDAS, true) ? $item['familia'] : 'otros';
        $grupos[$fam][] = $item;
    }
    uksort($grupos, fn($a, $b) => (ORDEN_FAMILIAS[$a] ?? 9) <=> (ORDEN_FAMILIAS[$b] ?? 9));
    return $grupos;
}

/**
 * Familia del depósito que tiene asignado a este usuario como responsable.
 * Devuelve null si no es responsable de ningún depósito.
 */
function familiaDelResponsable(PDO $pdo, string $usuarioId): ?string
{
    $stmt = $pdo->query("SELECT valor FROM configuraciones WHERE tipo = 'deposito' AND activo = 1");
    foreach ($stmt->fetchAll() as $row) {
        $dep = json_decode($row['valor'], true);
        if (($dep['responsableId'] ?? null) === $usuarioId) return $dep['familia'] ?? null;
    }
    return null;
}

/**
 * Un usuario de Depósito sólo puede ver/tocar la familia de su depósito.
 * Los administradores ven todo.
 */
function familiaPermitida(PDO $pdo, array $auth): ?string
{
    if (($auth['rol'] ?? '') === 'Administrador') return null; // sin restricción
    return familiaDelResponsable($pdo, $auth['id']);
}

function ensamblarPedido(PDO $pdo, array $aprobacion, ?string $soloFamilia = null): array
{
    if ($soloFamilia !== null) {
        $stmt = $pdo->prepare('SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId = ? AND familia = ? ORDER BY id');
        $stmt->execute([$aprobacion['id'], $soloFamilia]);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId = ? ORDER BY id');
        $stmt->execute([$aprobacion['id']]);
    }
    $subRows = $stmt->fetchAll();

    // Nombre del depósito por familia, para mostrarlo en la proforma
    $depositos = [];
    foreach ($pdo->query("SELECT valor FROM configuraciones WHERE tipo = 'deposito'")->fetchAll() as $r) {
        $d = json_decode($r['valor'], true);
        if (!empty($d['familia'])) $depositos[$d['familia']] = $d;
    }

    $subpedidos = [];
    foreach ($subRows as $sub) {
        // Los reemplazos van justo detrás del item que sustituyen
        $istmt = $pdo->prepare('SELECT * FROM aprobaciones_items WHERE subpedidoId = ? ORDER BY COALESCE(reemplazaA, id), id');
        $istmt->execute([$sub['id']]);
        $items = array_map(fn($it) => [
            'id' => (int) $it['id'],
            'codigo' => $it['codigo'],
            'descripcion' => $it['descripcion'],
            'medida' => $it['medida'],
            'marca' => $it['marca'],
            'familia' => $it['familia'],
            'subfamilia' => $it['subfamilia'],
            'precioGranel' => (float) $it['precioGranel'],
            'cantidad' => (float) $it['cantidad'],
            'cantidadConfirmada' => $it['cantidadConfirmada'] === null ? null : (float) $it['cantidadConfirmada'],
            'estado' => $it['estado'] ?? 'pendiente',
            'reemplazaA' => $it['reemplazaA'] === null ? null : (int) $it['reemplazaA'],
            'nota' => $it['nota'],
            // Desglose congelado al momento de crear el pedido (V004)
            'descAjusteFamilia' => (float) ($it['descAjusteFamilia'] ?? 0),
            'precioLista' => (float) ($it['precioLista'] ?? 0),
            'precioNeto' => (float) ($it['precioNeto'] ?? 0),
            'descFamilia1' => (float) ($it['descFamilia1'] ?? 0),
            'descFamilia2' => (float) ($it['descFamilia2'] ?? 0),
            'descPago1' => (float) ($it['descPago1'] ?? 0),
            'descPago2' => (float) ($it['descPago2'] ?? 0),
            'descCliente' => (float) ($it['descCliente'] ?? 0),
        ], $istmt->fetchAll());

        $pendientes = count(array_filter($items, fn($i) => $i['estado'] === 'pendiente'));
        $dep = $depositos[$sub['familia']] ?? null;

        // Lo que no tiene stock no suma: ni al subtotal ni al total del pedido.
        $entregables = array_filter($items, fn($i) => $i['estado'] !== 'sin_stock');
        $subtotal = array_sum(array_map(
            fn($i) => ($i['cantidadConfirmada'] ?? $i['cantidad']) * $i['precioNeto'],
            $entregables
        ));
        // Cuánto habría salido esta familia sin el ajuste, para mostrar el efecto.
        $subtotalSinAjuste = array_sum(array_map(function ($i) {
            $factor = 1 + ($i['descAjusteFamilia'] ?? 0) / 100;
            $sinAjuste = $factor != 0 ? $i['precioNeto'] / $factor : $i['precioNeto'];
            return ($i['cantidadConfirmada'] ?? $i['cantidad']) * $sinAjuste;
        }, $entregables));

        $subpedidos[] = [
            'id' => (int) $sub['id'],
            'familia' => $sub['familia'],
            'descuentoFamilia' => (float) ($sub['descuentoFamilia'] ?? 0),
            'subtotalSinAjuste' => round($subtotalSinAjuste, 2),
            'depositoNumero' => $dep['numero'] ?? null,
            'depositoNombre' => $dep['nombre'] ?? null,
            'responsableId' => $dep['responsableId'] ?? null,
            'aprobado' => (bool) $sub['aprobado'],
            'aprobadoPor' => $sub['aprobadoPor'],
            'fechaAprobacion' => $sub['fechaAprobacion'],
            'itemsPendientes' => $pendientes,
            'subtotal' => round($subtotal, 2),
            'items' => $items,
        ];
    }

    $aprobacion['subpedidos'] = $subpedidos;
    $aprobacion['descuento'] = (float) $aprobacion['descuento'];
    $aprobacion['total'] = (float) $aprobacion['total'];
    $aprobacion['condicionPago'] = $aprobacion['condicionPago'] ?? 'contado';
    $aprobacion['tipoOrigen'] = $aprobacion['tipoOrigen'] ?? 'cotizacion';

    // Totales de lo que efectivamente se entrega, para la proforma.
    $entregables = [];
    $sinStock = 0;
    foreach ($subpedidos as $sub) {
        foreach ($sub['items'] as $i) {
            if ($i['estado'] === 'sin_stock') $sinStock++;
            else $entregables[] = $i;
        }
    }
    $aLista = array_sum(array_map(
        fn($i) => ($i['cantidadConfirmada'] ?? $i['cantidad']) * $i['precioLista'],
        $entregables
    ));
    $aNeto = array_sum(array_map(
        fn($i) => ($i['cantidadConfirmada'] ?? $i['cantidad']) * $i['precioNeto'],
        $entregables
    ));

    $aprobacion['totales'] = [
        'subtotalLista' => round($aLista, 2),
        'totalNeto' => round($aNeto, 2),
        'ahorro' => round($aLista - $aNeto, 2),
        'descuentoEfectivo' => $aLista > 0 ? round((1 - $aNeto / $aLista) * 100, 2) : 0.0,
        'itemsSinStock' => $sinStock,
    ];

    return $aprobacion;
}

/**
 * Recalcula el total sumando sólo lo que no quedó sin stock.
 *
 * Desde V004 el descuento ya viene aplicado en `precioNeto` de cada renglón,
 * así que acá no se vuelve a descontar nada: sumar y listo. Antes se sumaba
 * precioGranel y se aplicaba el descuento del pedido al final.
 */
function recalcularTotal(PDO $pdo, string $aprobacionId): float
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(COALESCE(i.cantidadConfirmada, i.cantidad) * i.precioNeto), 0) neto,
                COALESCE(SUM(COALESCE(i.cantidadConfirmada, i.cantidad) * i.precioLista), 0) lista
         FROM aprobaciones_items i
         JOIN aprobaciones_subpedidos s ON s.id = i.subpedidoId
         WHERE s.aprobacionId = ? AND i.estado != 'sin_stock'"
    );
    $stmt->execute([$aprobacionId]);
    $fila = $stmt->fetch();

    $total = round((float) $fila['neto'], 2);
    $pdo->prepare('UPDATE aprobaciones SET total = ?, subtotalLista = ? WHERE id = ?')
        ->execute([$total, round((float) $fila['lista'], 2), $aprobacionId]);

    return $total;
}

function buscarPorId(PDO $pdo, string $id, ?string $soloFamilia = null): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? ensamblarPedido($pdo, $row, $soloFamilia) : null;
}

function buscarPorToken(PDO $pdo, string $token): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE token = ?');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    return $row ? ensamblarPedido($pdo, $row) : null;
}

function rutaAprobacionesCrear(): void
{
    $auth = requireAuth();
    $body = cuerpoJson();
    $pedido = $body['pedido'] ?? null;
    $cliente = $body['cliente'] ?? [];

    if (empty($pedido['items'])) jsonError('Pedido vacío', 400);

    $pdo = obtenerPDO();
    $cfg = configDescuentos($pdo);

    $descuento = (float) ($cliente['descuento'] ?? 0);
    // La condición de pago del pedido; si no viene, la habitual del cliente.
    $condicionPago = condicionPagoValida($pedido['condicionPago'] ?? $cliente['condicionPago'] ?? null);
    // 'directo' saltea la confirmación del cliente (requisito 6 del análisis).
    $tipoOrigen = ($pedido['tipoOrigen'] ?? '') === 'directo' ? 'directo' : 'cotizacion';

    $id = (string) round(microtime(true) * 1000);
    $token = bin2hex(random_bytes(9));

    $stmt = $pdo->prepare(
        "INSERT INTO aprobaciones
         (id, token, clienteId, clienteNombre, clienteTelefono, clienteEmail, descuento, total, estado, condicionPago, tipoOrigen, subtotalLista)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'en_aprobacion', ?, ?, 0)"
    );
    $stmt->execute([
        $id, $token, $cliente['id'] ?? null, $cliente['nombre'] ?? 'Sin cliente',
        $cliente['telefono'] ?? '', $cliente['email'] ?? '', $descuento,
        $condicionPago, $tipoOrigen,
    ]);

    // Ajuste por familia que cargó el vendedor: negativo descuenta, positivo
    // aumenta. Si no vino ninguno, se usa el base de Configuraciones.
    $ajustes = is_array($pedido['descuentosFamilia'] ?? null) ? $pedido['descuentosFamilia'] : [];

    $grupos = agruparPorFamilia($pedido['items']);
    foreach ($grupos as $familia => $items) {
        $ajuste = ajusteValido(
            $ajustes[$familia] ?? ($cfg['ajuste'][$familia] ?? 0),
            $cfg['rango']
        );

        $stmt = $pdo->prepare(
            'INSERT INTO aprobaciones_subpedidos (aprobacionId, familia, aprobado, descuentoFamilia)
             VALUES (?, ?, 0, ?)'
        );
        $stmt->execute([$id, $familia, $ajuste]);
        $subpedidoId = $pdo->lastInsertId();

        foreach ($items as $it) {
            // El desglose se calcula acá y queda congelado: si mañana cambian
            // los porcentajes, este pedido sigue mostrando los suyos.
            $d = calcularDesglose(
                ['familia' => $it['familia'] ?? $familia] + $it,
                $cfg,
                $condicionPago,
                $descuento,
                $ajuste
            );

            $stmt = $pdo->prepare(
                'INSERT INTO aprobaciones_items
                 (subpedidoId, codigo, descripcion, medida, marca, familia, subfamilia, precioGranel, cantidad,
                  precioLista, descFamilia1, descFamilia2, descAjusteFamilia, descPago1, descPago2, descCliente, precioNeto)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $subpedidoId, $it['codigo'] ?? null, $it['descripcion'], $it['medida'] ?? null, $it['marca'] ?? null,
                $it['familia'] ?? $familia, $it['subfamilia'] ?? null, $it['precioGranel'] ?? $it['precio'] ?? 0, $it['cantidad'] ?? 1,
                $d['precioLista'], $d['descFamilia1'], $d['descFamilia2'], $d['descAjusteFamilia'],
                $d['descPago1'], $d['descPago2'], $d['descCliente'], $d['precioNeto'],
            ]);
        }
    }

    recalcularTotal($pdo, $id);
    registrarEvento($pdo, $id, 'creado', [
        'estadoNuevo' => 'en_aprobacion',
        'usuarioId' => $auth['id'],
        'usuarioNombre' => nombreUsuario($pdo, $auth['id']),
        'detalle' => sprintf(
            '%d producto(s) en %d depósito(s), pago %s, %s',
            count($pedido['items']), count($grupos), $condicionPago,
            $tipoOrigen === 'directo' ? 'pedido directo' : 'con cotización'
        ),
    ]);

    jsonSalida(buscarPorId($pdo, $id), 201);
}

function rutaAprobacionesListar(): void
{
    $auth = requireAuth();
    $pdo = obtenerPDO();
    $soloFamilia = familiaPermitida($pdo, $auth);

    $estado = $_GET['estado'] ?? '';
    if ($estado !== '') {
        $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE estado = ? ORDER BY fechaCreacion DESC');
        $stmt->execute([$estado]);
    } else {
        $stmt = $pdo->query('SELECT * FROM aprobaciones ORDER BY fechaCreacion DESC');
    }

    $pedidos = array_map(fn($r) => ensamblarPedido($pdo, $r, $soloFamilia), $stmt->fetchAll());

    // Al responsable de un depósito no le mostramos pedidos que no lo involucran
    if ($soloFamilia !== null) {
        $pedidos = array_values(array_filter($pedidos, fn($p) => !empty($p['subpedidos'])));
    }

    jsonSalida($pedidos);
}

function rutaAprobacionesObtener(string $id): void
{
    $auth = requireAuth();
    $pdo = obtenerPDO();
    $soloFamilia = familiaPermitida($pdo, $auth);

    $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) jsonError('No encontrado', 404);

    $pedido = ensamblarPedido($pdo, $row, $soloFamilia);
    if ($soloFamilia !== null && empty($pedido['subpedidos'])) {
        jsonError('Este pedido no tiene productos de tu depósito', 403);
    }
    jsonSalida($pedido);
}

/** Busca el item y valida que el usuario tenga permiso sobre su depósito. */
function itemConPermiso(PDO $pdo, string $aprobacionId, string $itemId, array $auth): array
{
    $stmt = $pdo->prepare(
        'SELECT i.*, s.familia, s.aprobacionId, s.aprobado, s.descuentoFamilia
         FROM aprobaciones_items i
         JOIN aprobaciones_subpedidos s ON s.id = i.subpedidoId
         WHERE i.id = ? AND s.aprobacionId = ?'
    );
    $stmt->execute([$itemId, $aprobacionId]);
    $item = $stmt->fetch();
    if (!$item) jsonError('Producto no encontrado en este pedido', 404);

    $soloFamilia = familiaPermitida($pdo, $auth);
    if ($soloFamilia !== null && $item['familia'] !== $soloFamilia) {
        jsonError('Ese producto no pertenece a tu depósito', 403);
    }
    if ((int) $item['aprobado'] === 1) {
        jsonError('Este depósito ya fue aprobado, no se puede modificar', 409);
    }
    return $item;
}

/** POST /aprobaciones/:id/items/:itemId/confirmar — hay stock. */
function rutaAprobacionesConfirmarItem(string $id, string $itemId): void
{
    $auth = requireAuth();
    requireRole($auth, ['Deposito', 'Administrador']);
    $pdo = obtenerPDO();
    $item = itemConPermiso($pdo, $id, $itemId, $auth);

    $body = cuerpoJson();
    // Permite confirmar una cantidad menor a la pedida (entrega parcial)
    $cantidad = isset($body['cantidad']) ? (float) $body['cantidad'] : (float) $item['cantidad'];
    if ($cantidad <= 0) jsonError('La cantidad debe ser mayor a cero', 400);

    $pdo->prepare("UPDATE aprobaciones_items SET estado = 'confirmado', cantidadConfirmada = ?, nota = ? WHERE id = ?")
        ->execute([$cantidad, $body['nota'] ?? null, $itemId]);

    $pedida = (float) $item['cantidad'];
    registrarEvento($pdo, $id, 'stock_confirmado', [
        'itemId' => (int) $itemId,
        'usuarioId' => $auth['id'],
        'usuarioNombre' => nombreUsuario($pdo, $auth['id']),
        'detalle' => $cantidad < $pedida
            ? sprintf('%s: entrega parcial, pedidas %s y se confirman %s', $item['descripcion'], $pedida, $cantidad)
            : sprintf('%s: hay stock (%s)', $item['descripcion'], $cantidad),
    ]);

    recalcularTotal($pdo, $id);
    jsonSalida(buscarPorId($pdo, $id, familiaPermitida($pdo, $auth)));
}

/**
 * POST /aprobaciones/:id/items/:itemId/sin-stock
 * Marca el producto como sin stock (queda tachado). Si viene 'reemplazo',
 * agrega el producto alternativo como un item nuevo enlazado al original.
 */
function rutaAprobacionesSinStock(string $id, string $itemId): void
{
    $auth = requireAuth();
    requireRole($auth, ['Deposito', 'Administrador']);
    $pdo = obtenerPDO();
    $item = itemConPermiso($pdo, $id, $itemId, $auth);

    $body = cuerpoJson();
    $nota = $body['nota'] ?? 'Sin stock';
    $reemplazo = $body['reemplazo'] ?? null;

    $pdo->beginTransaction();
    try {
        $pdo->prepare("UPDATE aprobaciones_items SET estado = 'sin_stock', cantidadConfirmada = 0, nota = ? WHERE id = ?")
            ->execute([$nota, $itemId]);

        if ($reemplazo) {
            if (empty($reemplazo['descripcion'])) {
                throw new RuntimeException('El producto de reemplazo necesita descripción');
            }

            // El reemplazo se cotiza con las mismas reglas que el resto del pedido.
            $cab = $pdo->prepare('SELECT condicionPago, descuento FROM aprobaciones WHERE id = ?');
            $cab->execute([$id]);
            $pedido = $cab->fetch() ?: ['condicionPago' => 'contado', 'descuento' => 0];

            // El reemplazo hereda el ajuste de su familia en este pedido.
            $d = calcularDesglose(
                ['familia' => $item['familia']] + $reemplazo,
                configDescuentos($pdo),
                $pedido['condicionPago'],
                (float) $pedido['descuento'],
                (float) ($item['descuentoFamilia'] ?? 0)
            );

            $pdo->prepare(
                "INSERT INTO aprobaciones_items
                 (subpedidoId, codigo, descripcion, medida, marca, familia, subfamilia,
                  precioGranel, cantidad, cantidadConfirmada, estado, reemplazaA, nota,
                  precioLista, descFamilia1, descFamilia2, descAjusteFamilia, descPago1, descPago2, descCliente, precioNeto)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reemplazo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )->execute([
                $item['subpedidoId'],
                $reemplazo['codigo'] ?? null,
                $reemplazo['descripcion'],
                $reemplazo['medida'] ?? null,
                $reemplazo['marca'] ?? null,
                $item['familia'],
                $reemplazo['subfamilia'] ?? null,
                $reemplazo['precioGranel'] ?? $reemplazo['precio'] ?? 0,
                $reemplazo['cantidad'] ?? $item['cantidad'],
                $reemplazo['cantidad'] ?? $item['cantidad'],
                $itemId,
                'Reemplaza a ' . ($item['codigo'] ?: $item['descripcion']),
                $d['precioLista'], $d['descFamilia1'], $d['descFamilia2'], $d['descAjusteFamilia'],
                $d['descPago1'], $d['descPago2'], $d['descCliente'], $d['precioNeto'],
            ]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonError($e->getMessage(), 400);
    }

    registrarEvento($pdo, $id, 'sin_stock', [
        'itemId' => (int) $itemId,
        'usuarioId' => $auth['id'],
        'usuarioNombre' => nombreUsuario($pdo, $auth['id']),
        'detalle' => $reemplazo
            ? sprintf('%s sin stock, reemplazado por %s', $item['descripcion'], $reemplazo['descripcion'])
            : sprintf('%s sin stock, sin reemplazo', $item['descripcion']),
    ]);

    recalcularTotal($pdo, $id);
    jsonSalida(buscarPorId($pdo, $id, familiaPermitida($pdo, $auth)));
}

function rutaAprobacionesAprobarFamilia(string $id): void
{
    $auth = requireAuth();
    requireRole($auth, ['Deposito', 'Administrador']);

    $body = cuerpoJson();
    $familia = $body['familia'] ?? '';

    $pdo = obtenerPDO();
    $soloFamilia = familiaPermitida($pdo, $auth);
    if ($soloFamilia !== null && $familia !== $soloFamilia) {
        jsonError('Sólo podés aprobar los productos de tu depósito', 403);
    }

    $stmt = $pdo->prepare('SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId = ? AND familia = ?');
    $stmt->execute([$id, $familia]);
    $sub = $stmt->fetch();
    if (!$sub) jsonError('Esa familia no está en este pedido', 404);

    // No se aprueba hasta revisar el stock de cada producto
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM aprobaciones_items WHERE subpedidoId = ? AND estado = 'pendiente'");
    $stmt->execute([$sub['id']]);
    if ((int) $stmt->fetchColumn() > 0) {
        jsonError('Todavía hay productos sin revisar. Confirmá o marcá sin stock cada uno.', 409);
    }

    $pdo->prepare('UPDATE aprobaciones_subpedidos SET aprobado = 1, aprobadoPor = ?, fechaAprobacion = NOW() WHERE id = ?')
        ->execute([$auth['id'], $sub['id']]);

    $quien = nombreUsuario($pdo, $auth['id']);
    registrarEvento($pdo, $id, 'deposito_aprobado', [
        'usuarioId' => $auth['id'],
        'usuarioNombre' => $quien,
        'detalle' => 'Depósito de ' . $familia . ' aprobado',
    ]);

    recalcularTotal($pdo, $id);

    $stmt = $pdo->prepare('SELECT aprobado FROM aprobaciones_subpedidos WHERE aprobacionId = ?');
    $stmt->execute([$id]);
    $todas = $stmt->fetchAll();

    if (!empty($todas) && array_reduce($todas, fn($acc, $s) => $acc && $s['aprobado'], true)) {
        $cab = $pdo->prepare('SELECT estado, tipoOrigen FROM aprobaciones WHERE id = ?');
        $cab->execute([$id]);
        $pedido = $cab->fetch();

        // Un pedido directo no necesita que el cliente confirme nada: ya lo
        // pidió él. Queda listo para facturar apenas los depósitos aprueban.
        $esDirecto = ($pedido['tipoOrigen'] ?? 'cotizacion') === 'directo';
        $nuevoEstado = $esDirecto ? 'confirmado' : 'esperando_confirmacion';

        if ($esDirecto) {
            $pdo->prepare("UPDATE aprobaciones SET estado = 'confirmado', fechaConfirmacion = NOW() WHERE id = ?")
                ->execute([$id]);
        } else {
            $pdo->prepare("UPDATE aprobaciones SET estado = 'esperando_confirmacion' WHERE id = ?")->execute([$id]);
        }

        registrarEvento($pdo, $id, 'cambio_estado', [
            'estadoAnterior' => $pedido['estado'] ?? null,
            'estadoNuevo' => $nuevoEstado,
            'usuarioId' => $auth['id'],
            'usuarioNombre' => $quien,
            'detalle' => $esDirecto
                ? 'Todos los depósitos aprobaron. Pedido directo: no requiere confirmación del cliente.'
                : 'Todos los depósitos aprobaron. Se puede enviar al cliente.',
        ]);
    }

    jsonSalida(buscarPorId($pdo, $id, $soloFamilia));
}

function rutaAprobacionesConfirmarObtener(string $token): void
{
    $pdo = obtenerPDO();
    $pedido = buscarPorToken($pdo, $token);
    if (!$pedido) jsonError('No encontrado', 404);
    if ($pedido['estado'] === 'en_aprobacion') jsonError('Todavía no está listo para confirmar', 409);
    jsonSalida($pedido);
}

function rutaAprobacionesConfirmarPost(string $token): void
{
    $pdo = obtenerPDO();
    $pedido = buscarPorToken($pdo, $token);
    if (!$pedido) jsonError('No encontrado', 404);
    if ($pedido['estado'] === 'en_aprobacion') jsonError('Todavía no está listo para confirmar', 409);

    $pdo->prepare("UPDATE aprobaciones SET estado = 'confirmado', fechaConfirmacion = NOW() WHERE token = ?")->execute([$token]);

    registrarEvento($pdo, $pedido['id'], 'cambio_estado', [
        'estadoAnterior' => $pedido['estado'],
        'estadoNuevo' => 'confirmado',
        'usuarioNombre' => $pedido['clienteNombre'],
        'detalle' => 'El cliente confirmó la cotización desde el link público',
    ]);

    jsonSalida(buscarPorToken($pdo, $token));
}

function rutaAprobacionesMarcarEnviado(string $id): void
{
    $auth = requireAuth();
    $pdo = obtenerPDO();

    $stmt = $pdo->prepare('UPDATE aprobaciones SET fechaEnvioCliente = NOW() WHERE id = ? AND fechaEnvioCliente IS NULL');
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
        registrarEvento($pdo, $id, 'enviado_cliente', [
            'usuarioId' => $auth['id'],
            'usuarioNombre' => nombreUsuario($pdo, $auth['id']),
            'detalle' => 'Cotización enviada al cliente',
        ]);
    }

    $pedido = buscarPorId($pdo, $id);
    if (!$pedido) jsonError('No encontrado', 404);
    jsonSalida($pedido);
}

/** GET /aprobaciones/:id/log — historial completo del pedido. */
function rutaAprobacionesLog(string $id): void
{
    requireAuth();
    $pdo = obtenerPDO();

    $stmt = $pdo->prepare(
        'SELECT id, evento, estadoAnterior, estadoNuevo, itemId, usuarioNombre, detalle, fecha
         FROM pedidos_log WHERE aprobacionId = ? ORDER BY fecha, id'
    );
    $stmt->execute([$id]);

    jsonSalida(array_map(fn($r) => [
        'id' => (int) $r['id'],
        'evento' => $r['evento'],
        'estadoAnterior' => $r['estadoAnterior'],
        'estadoNuevo' => $r['estadoNuevo'],
        'itemId' => $r['itemId'] === null ? null : (int) $r['itemId'],
        'usuarioNombre' => $r['usuarioNombre'],
        'detalle' => $r['detalle'],
        'fecha' => $r['fecha'],
    ], $stmt->fetchAll()));
}
