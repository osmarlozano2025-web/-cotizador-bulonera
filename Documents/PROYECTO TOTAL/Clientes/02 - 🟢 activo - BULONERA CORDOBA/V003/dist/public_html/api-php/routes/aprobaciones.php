<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';

const FAMILIAS_VALIDAS = ['buloneria', 'tolsen', 'mechas', 'electrodos'];

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
        ], $istmt->fetchAll());

        $pendientes = count(array_filter($items, fn($i) => $i['estado'] === 'pendiente'));
        $dep = $depositos[$sub['familia']] ?? null;

        $subpedidos[] = [
            'id' => (int) $sub['id'],
            'familia' => $sub['familia'],
            'depositoNumero' => $dep['numero'] ?? null,
            'depositoNombre' => $dep['nombre'] ?? null,
            'responsableId' => $dep['responsableId'] ?? null,
            'aprobado' => (bool) $sub['aprobado'],
            'aprobadoPor' => $sub['aprobadoPor'],
            'fechaAprobacion' => $sub['fechaAprobacion'],
            'itemsPendientes' => $pendientes,
            'items' => $items,
        ];
    }

    $aprobacion['subpedidos'] = $subpedidos;
    $aprobacion['descuento'] = (float) $aprobacion['descuento'];
    $aprobacion['total'] = (float) $aprobacion['total'];
    return $aprobacion;
}

/** Recalcula el total sumando sólo lo que no quedó sin stock. */
function recalcularTotal(PDO $pdo, string $aprobacionId): float
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(COALESCE(i.cantidadConfirmada, i.cantidad) * i.precioGranel), 0) t
         FROM aprobaciones_items i
         JOIN aprobaciones_subpedidos s ON s.id = i.subpedidoId
         WHERE s.aprobacionId = ? AND i.estado != 'sin_stock'"
    );
    $stmt->execute([$aprobacionId]);
    $bruto = (float) $stmt->fetchColumn();

    $d = $pdo->prepare('SELECT descuento FROM aprobaciones WHERE id = ?');
    $d->execute([$aprobacionId]);
    $desc = (float) $d->fetchColumn();
    $total = round($bruto * (1 - $desc / 100), 2);

    $pdo->prepare('UPDATE aprobaciones SET total = ? WHERE id = ?')->execute([$total, $aprobacionId]);
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
    requireAuth();
    $body = cuerpoJson();
    $pedido = $body['pedido'] ?? null;
    $cliente = $body['cliente'] ?? [];

    if (empty($pedido['items'])) jsonError('Pedido vacío', 400);

    $descuento = $cliente['descuento'] ?? 0;
    $total = 0;
    foreach ($pedido['items'] as $item) {
        $precio = $item['precioGranel'] ?? $item['precio'] ?? 0;
        $total += ($item['cantidad'] ?? 1) * $precio * (1 - $descuento / 100);
    }

    $pdo = obtenerPDO();
    $id = (string) round(microtime(true) * 1000);
    $token = bin2hex(random_bytes(9));

    $stmt = $pdo->prepare(
        "INSERT INTO aprobaciones (id, token, clienteId, clienteNombre, clienteTelefono, clienteEmail, descuento, total, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_aprobacion')"
    );
    $stmt->execute([
        $id, $token, $cliente['id'] ?? null, $cliente['nombre'] ?? 'Sin cliente',
        $cliente['telefono'] ?? '', $cliente['email'] ?? '', $descuento, round($total, 2),
    ]);

    $grupos = agruparPorFamilia($pedido['items']);
    foreach ($grupos as $familia => $items) {
        $stmt = $pdo->prepare('INSERT INTO aprobaciones_subpedidos (aprobacionId, familia, aprobado) VALUES (?, ?, 0)');
        $stmt->execute([$id, $familia]);
        $subpedidoId = $pdo->lastInsertId();

        foreach ($items as $it) {
            $stmt = $pdo->prepare(
                'INSERT INTO aprobaciones_items (subpedidoId, codigo, descripcion, medida, marca, familia, subfamilia, precioGranel, cantidad)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $subpedidoId, $it['codigo'] ?? null, $it['descripcion'], $it['medida'] ?? null, $it['marca'] ?? null,
                $it['familia'] ?? $familia, $it['subfamilia'] ?? null, $it['precioGranel'] ?? $it['precio'] ?? 0, $it['cantidad'] ?? 1,
            ]);
        }
    }

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
        'SELECT i.*, s.familia, s.aprobacionId, s.aprobado
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
            $pdo->prepare(
                "INSERT INTO aprobaciones_items
                 (subpedidoId, codigo, descripcion, medida, marca, familia, subfamilia,
                  precioGranel, cantidad, cantidadConfirmada, estado, reemplazaA, nota)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reemplazo', ?, ?)"
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
            ]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonError($e->getMessage(), 400);
    }

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

    recalcularTotal($pdo, $id);

    $stmt = $pdo->prepare('SELECT aprobado FROM aprobaciones_subpedidos WHERE aprobacionId = ?');
    $stmt->execute([$id]);
    $todas = $stmt->fetchAll();
    if (!empty($todas) && array_reduce($todas, fn($acc, $s) => $acc && $s['aprobado'], true)) {
        $pdo->prepare("UPDATE aprobaciones SET estado = 'esperando_confirmacion' WHERE id = ?")->execute([$id]);
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
    jsonSalida(buscarPorToken($pdo, $token));
}

function rutaAprobacionesMarcarEnviado(string $id): void
{
    requireAuth();
    $pdo = obtenerPDO();
    $pdo->prepare('UPDATE aprobaciones SET fechaEnvioCliente = NOW() WHERE id = ? AND fechaEnvioCliente IS NULL')->execute([$id]);
    $pedido = buscarPorId($pdo, $id);
    if (!$pedido) jsonError('No encontrado', 404);
    jsonSalida($pedido);
}
