<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';

const FAMILIAS_VALIDAS = ['buloneria', 'tolsen', 'mechas'];

function agruparPorFamilia(array $items): array
{
    $grupos = [];
    foreach ($items as $item) {
        $fam = in_array($item['familia'] ?? null, FAMILIAS_VALIDAS, true) ? $item['familia'] : 'otros';
        $grupos[$fam][] = $item;
    }
    return $grupos;
}

function ensamblarPedido(PDO $pdo, array $aprobacion): array
{
    $stmt = $pdo->prepare('SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId = ? ORDER BY id');
    $stmt->execute([$aprobacion['id']]);
    $subRows = $stmt->fetchAll();

    $subpedidos = [];
    foreach ($subRows as $sub) {
        $istmt = $pdo->prepare('SELECT * FROM aprobaciones_items WHERE subpedidoId = ?');
        $istmt->execute([$sub['id']]);
        $items = array_map(fn($it) => [
            'codigo' => $it['codigo'],
            'descripcion' => $it['descripcion'],
            'medida' => $it['medida'],
            'marca' => $it['marca'],
            'familia' => $it['familia'],
            'subfamilia' => $it['subfamilia'],
            'precioGranel' => (float) $it['precioGranel'],
            'cantidad' => (float) $it['cantidad'],
        ], $istmt->fetchAll());

        $subpedidos[] = [
            'familia' => $sub['familia'],
            'aprobado' => (bool) $sub['aprobado'],
            'aprobadoPor' => $sub['aprobadoPor'],
            'fechaAprobacion' => $sub['fechaAprobacion'],
            'items' => $items,
        ];
    }

    $aprobacion['subpedidos'] = $subpedidos;
    $aprobacion['descuento'] = (float) $aprobacion['descuento'];
    $aprobacion['total'] = (float) $aprobacion['total'];
    return $aprobacion;
}

function buscarPorId(PDO $pdo, string $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? ensamblarPedido($pdo, $row) : null;
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
    requireAuth();
    $pdo = obtenerPDO();
    $estado = $_GET['estado'] ?? '';
    if ($estado !== '') {
        $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE estado = ? ORDER BY fechaCreacion DESC');
        $stmt->execute([$estado]);
    } else {
        $stmt = $pdo->query('SELECT * FROM aprobaciones ORDER BY fechaCreacion DESC');
    }
    jsonSalida(array_map(fn($r) => ensamblarPedido($pdo, $r), $stmt->fetchAll()));
}

function rutaAprobacionesObtener(string $id): void
{
    requireAuth();
    $pdo = obtenerPDO();
    $pedido = buscarPorId($pdo, $id);
    if (!$pedido) jsonError('No encontrado', 404);
    jsonSalida($pedido);
}

function rutaAprobacionesAprobarFamilia(string $id): void
{
    $auth = requireAuth();
    requireRole($auth, ['Deposito', 'Administrador']);

    $body = cuerpoJson();
    $familia = $body['familia'] ?? '';

    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId = ? AND familia = ?');
    $stmt->execute([$id, $familia]);
    $sub = $stmt->fetch();
    if (!$sub) jsonError('Esa familia no está en este pedido', 404);

    $pdo->prepare('UPDATE aprobaciones_subpedidos SET aprobado = 1, aprobadoPor = ?, fechaAprobacion = NOW() WHERE id = ?')
        ->execute([$auth['id'], $sub['id']]);

    $stmt = $pdo->prepare('SELECT aprobado FROM aprobaciones_subpedidos WHERE aprobacionId = ?');
    $stmt->execute([$id]);
    $todas = $stmt->fetchAll();
    if (!empty($todas) && array_reduce($todas, fn($acc, $s) => $acc && $s['aprobado'], true)) {
        $pdo->prepare("UPDATE aprobaciones SET estado = 'esperando_confirmacion' WHERE id = ?")->execute([$id]);
    }

    jsonSalida(buscarPorId($pdo, $id));
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
