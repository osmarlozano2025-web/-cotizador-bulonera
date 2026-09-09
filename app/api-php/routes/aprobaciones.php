<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/precios.php';
require_once __DIR__ . '/../lib/depositos.php';

// Las familias salen de la configuración (lib/precios.php), no de una lista
// escrita acá: ver familiasConfiguradas().

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

/** Agrupa los renglones por familia, en el orden configurado. */
function agruparPorFamilia(PDO $pdo, array $items): array
{
    $conocidas = familiasConfiguradas($pdo);

    $grupos = [];
    foreach ($items as $item) {
        $fam = isset($conocidas[$item['familia'] ?? '']) ? $item['familia'] : 'otros';
        $grupos[$fam][] = $item;
    }

    $orden = fn($f) => $conocidas[$f]['orden'] ?? 99;
    uksort($grupos, fn($a, $b) => $orden($a) <=> $orden($b));
    return $grupos;
}

function ensamblarVarios(PDO $pdo, array $filas, ?array $soloFamilias = null): array
{
    if (!$filas) return [];

    $ids = array_column($filas, 'id');
    $subRows = [];

    // Un responsable de depósito ve sólo las familias que su depósito despacha.
    if ($soloFamilias === null || $soloFamilias) {
        $sql = 'SELECT * FROM aprobaciones_subpedidos WHERE aprobacionId IN ('
             . implode(',', array_fill(0, count($ids), '?')) . ')';
        $params = $ids;

        if ($soloFamilias !== null) {
            $sql .= ' AND familia IN (' . implode(',', array_fill(0, count($soloFamilias), '?')) . ')';
            $params = array_merge($params, $soloFamilias);
        }

        $stmt = $pdo->prepare($sql . ' ORDER BY id');
        $stmt->execute($params);
        $subRows = $stmt->fetchAll();
    }

    $itemsPorSub = [];
    if ($subRows) {
        $subIds = array_column($subRows, 'id');
        // Los reemplazos van justo detrás del item que sustituyen
        $stmt = $pdo->prepare(
            'SELECT * FROM aprobaciones_items WHERE subpedidoId IN ('
            . implode(',', array_fill(0, count($subIds), '?'))
            . ') ORDER BY subpedidoId, COALESCE(reemplazaA, id), id'
        );
        $stmt->execute($subIds);
        foreach ($stmt->fetchAll() as $it) $itemsPorSub[$it['subpedidoId']][] = $it;
    }

    $subsPorPedido = [];
    foreach ($subRows as $s) $subsPorPedido[$s['aprobacionId']][] = $s;

    return array_map(
        fn($fila) => armarPedido($pdo, $fila, $subsPorPedido[$fila['id']] ?? [], $itemsPorSub),
        $filas
    );
}

function ensamblarPedido(PDO $pdo, array $aprobacion, ?array $soloFamilias = null): array
{
    return ensamblarVarios($pdo, [$aprobacion], $soloFamilias)[0];
}

function armarPedido(PDO $pdo, array $aprobacion, array $subRows, array $itemsPorSub): array
{
    $subpedidos = [];
    foreach ($subRows as $sub) {
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
            // Cómo quedó el renglón: granel, fracción o unidad, y cuántos
            // bultos son. Se guardó al cotizar y no se recalcula.
            'modoVenta' => $it['modoVenta'] ?? 'unidad',
            'bultos' => (int) ($it['bultos'] ?? 0),
            'unidadGranel' => $it['unidadGranel'] === null ? null : (float) $it['unidadGranel'],
            'unidadFraccion' => $it['unidadFraccion'] === null ? null : (float) $it['unidadFraccion'],
            'descuentoItem' => (float) ($it['descuentoItem'] ?? 0),
            'ivaPorcentaje' => (float) ($it['ivaPorcentaje'] ?? 21),
            'cantidadConfirmada' => $it['cantidadConfirmada'] === null ? null : (float) $it['cantidadConfirmada'],
            'estado' => $it['estado'] ?? 'pendiente',
            'reemplazaA' => $it['reemplazaA'] === null ? null : (int) $it['reemplazaA'],
            'nota' => $it['nota'],
            // Desglose congelado al momento de crear el pedido (V004)
            'descBase' => (float) ($it['descBase'] ?? 0),
            'descAjusteFamilia' => (float) ($it['descAjusteFamilia'] ?? 0),
            'precioLista' => (float) ($it['precioLista'] ?? 0),
            'precioNeto' => (float) ($it['precioNeto'] ?? 0),
            'descFamilia1' => (float) ($it['descFamilia1'] ?? 0),
            'descFamilia2' => (float) ($it['descFamilia2'] ?? 0),
            'descPago1' => (float) ($it['descPago1'] ?? 0),
            'descPago2' => (float) ($it['descPago2'] ?? 0),
            'descCliente' => (float) ($it['descCliente'] ?? 0),
        ], $itemsPorSub[$sub['id']] ?? []);

        $pendientes = count(array_filter($items, fn($i) => $i['estado'] === 'pendiente'));
        $dep = depositoDeFamilia($pdo, $sub['familia']);

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
            // Tope vigente de esa familia, para que la UI sepa hasta dónde llega
            'topeFamilia' => configDescuentos($pdo)['topes'][$sub['familia']] ?? 0,
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
    // El nombre viaja con el pedido para que la proforma no tenga que pedir la
    // configuración entera: la abre el cliente, que no tiene sesión.
    $aprobacion['condicionPagoEtiqueta'] =
        configDescuentos($pdo)['etiquetasPago'][$aprobacion['condicionPago']] ?? $aprobacion['condicionPago'];
    $aprobacion['tipoOrigen'] = $aprobacion['tipoOrigen'] ?? 'cotizacion';
    // null = todavía no se contaron, distinto de 0 = no se despachó nada
    $aprobacion['bultos'] = isset($aprobacion['bultos']) && $aprobacion['bultos'] !== null
        ? (int) $aprobacion['bultos']
        : null;

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

function buscarPorId(PDO $pdo, string $id, ?array $soloFamilias = null): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? ensamblarPedido($pdo, $row, $soloFamilias) : null;
}

function buscarPorToken(PDO $pdo, string $token): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE token = ?');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) return null;

    $pedido = ensamblarPedido($pdo, $row);

    // La proforma la abre el cliente sin estar logueado. Los datos de su ficha
    // viajan acá, amparados por el token del link, en lugar de tener que dejar
    // /clientes abierto a cualquiera para que la página los pueda pedir.
    if (!empty($row['clienteId'])) {
        $c = $pdo->prepare('SELECT nombre, razonSocial, cuit, telefono, email, localidad, provincia FROM clientes WHERE id = ?');
        $c->execute([$row['clienteId']]);
        $pedido['cliente'] = $c->fetch() ?: null;
    }

    return $pedido;
}

/**
 * Los productos del catálogo que menciona el pedido, indexados por código.
 *
 * El precio de venta lo pone el catálogo, no el navegador: lo que llega en el
 * JSON es lo que el vendedor tenía en pantalla, y puede estar viejo o retocado.
 */
function catalogoDelPedido(PDO $pdo, array $items): array
{
    $codigos = array_values(array_unique(array_filter(
        array_map(fn($i) => $i['codigo'] ?? null, $items),
        fn($c) => $c !== null && $c !== ''
    )));
    if (!$codigos) return [];

    $huecos = implode(',', array_fill(0, count($codigos), '?'));
    $stmt = $pdo->prepare(
        "SELECT codigo, descripcion, medida, marca, familia, subfamilia,
                precioLista, precioGranel, unidadGranel, unidadFraccion, ivaPorcentaje
         FROM productos WHERE codigo IN ($huecos)"
    );
    $stmt->execute($codigos);

    $porCodigo = [];
    foreach ($stmt->fetchAll() as $p) $porCodigo[$p['codigo']] = $p;
    return $porCodigo;
}

function rutaAprobacionesCrear(): void
{
    $auth = requireAuth();
    $body = cuerpoJson();
    $pedido = $body['pedido'] ?? null;
    $cliente = $body['cliente'] ?? [];

    if (empty($pedido['items'])) jsonError('Pedido vacío', 400);
    // Sin cliente no hay pedido: los descuentos y la proforma dependen de él.
    if (empty($cliente['id'])) jsonError('Elegí un cliente antes de enviar el pedido a aprobación', 400);

    $pdo = obtenerPDO();
    $cfg = configDescuentos($pdo);

    // El descuento y los datos salen de la ficha del cliente. Si se tomaran del
    // JSON, cualquiera podría cotizar con el descuento que se le ocurra.
    $stmt = $pdo->prepare('SELECT id, nombre, telefono, email, descuento FROM clientes WHERE id = ?');
    $stmt->execute([$cliente['id']]);
    $ficha = $stmt->fetch();
    if (!$ficha) jsonError('Ese cliente no existe', 404);

    $descuento = (float) $ficha['descuento'];
    $condicionPago = condicionPagoValida($cfg, $pedido['condicionPago'] ?? null);
    // 'directo' saltea la confirmación del cliente (requisito 6 del análisis).
    $tipoOrigen = ($pedido['tipoOrigen'] ?? '') === 'directo' ? 'directo' : 'cotizacion';

    $id = (string) round(microtime(true) * 1000);
    $token = bin2hex(random_bytes(16));
    $catalogo = catalogoDelPedido($pdo, $pedido['items']);

    // Un pedido a medio grabar no sirve para nada: o entra entero o no entra.
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO aprobaciones
             (id, token, clienteId, clienteNombre, clienteTelefono, clienteEmail, descuento, total, estado, condicionPago, tipoOrigen, subtotalLista)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'en_aprobacion', ?, ?, 0)"
        );
        $stmt->execute([
            $id, $token, $ficha['id'], $ficha['nombre'],
            $ficha['telefono'] ?? '', $ficha['email'] ?? '', $descuento,
            $condicionPago, $tipoOrigen,
        ]);

        // Ajuste por familia que cargó el vendedor: negativo descuenta, positivo
        // aumenta. Arranca en 0 y no puede pasar el tope de esa familia.
        $ajustes = is_array($pedido['descuentosFamilia'] ?? null) ? $pedido['descuentosFamilia'] : [];

        $grupos = agruparPorFamilia($pdo, $pedido['items']);
        foreach ($grupos as $familia => $items) {
            $ajuste = ajusteDentroDelTope(
                $ajustes[$familia] ?? 0,
                $cfg['topes'][$familia] ?? 0
            );

            $stmt = $pdo->prepare(
                'INSERT INTO aprobaciones_subpedidos (aprobacionId, familia, aprobado, descuentoFamilia)
                 VALUES (?, ?, 0, ?)'
            );
            $stmt->execute([$id, $familia, $ajuste]);
            $subpedidoId = $pdo->lastInsertId();

            foreach ($items as $it) {
                // Si el producto está en el catálogo manda el catálogo. Uno
                // suelto —cargado a mano o leído de una foto— va como viene.
                $delCatalogo = $catalogo[$it['codigo'] ?? ''] ?? null;
                $renglon = [
                    'codigo' => $it['codigo'] ?? null,
                    'descripcion' => $delCatalogo['descripcion'] ?? $it['descripcion'] ?? null,
                    'medida' => $delCatalogo['medida'] ?? $it['medida'] ?? null,
                    'marca' => $delCatalogo['marca'] ?? $it['marca'] ?? null,
                    'familia' => $delCatalogo['familia'] ?? $it['familia'] ?? $familia,
                    'subfamilia' => $delCatalogo['subfamilia'] ?? $it['subfamilia'] ?? null,
                    // El precio de partida es el de lista.
                    'precioLista' => (float) ($delCatalogo['precioLista'] ?? $it['precioLista'] ?? $it['precio'] ?? 0),
                    'precioGranel' => (float) ($delCatalogo['precioGranel'] ?? $it['precioGranel'] ?? 0),
                    // Los bultos del producto: con esto se sabe si el renglón
                    // quedó en granel, en fracción o suelto.
                    'unidadGranel' => $delCatalogo['unidadGranel'] ?? $it['unidadGranel'] ?? null,
                    'unidadFraccion' => $delCatalogo['unidadFraccion'] ?? $it['unidadFraccion'] ?? null,
                    // El 21% de fábrica si el producto no trae uno propio.
                    'ivaPorcentaje' => (float) ($delCatalogo['ivaPorcentaje'] ?? $it['ivaPorcentaje'] ?? 21),
                    'cantidad' => (float) ($it['cantidad'] ?? 1),
                ];
                if ($renglon['descripcion'] === null || $renglon['descripcion'] === '') {
                    throw new RuntimeException('Hay un renglón sin descripción');
                }
                if ($renglon['cantidad'] <= 0) {
                    throw new RuntimeException('Hay un renglón con cantidad cero');
                }

                // El desglose se calcula acá y queda congelado: si mañana cambian
                // los porcentajes, este pedido sigue mostrando los suyos.
                $d = calcularDesglose(
                    $renglon, $cfg, $condicionPago, $descuento, $ajuste,
                    (float) ($it['descuentoItem'] ?? 0)
                );

                $stmt = $pdo->prepare(
                    'INSERT INTO aprobaciones_items
                     (subpedidoId, codigo, descripcion, medida, marca, familia, subfamilia, precioGranel, cantidad,
                      modoVenta, bultos, unidadGranel, unidadFraccion, descuentoItem, ivaPorcentaje,
                      precioLista, descAjusteFamilia, descPago1, descPago2, descCliente, precioNeto)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute([
                    $subpedidoId, $renglon['codigo'], $renglon['descripcion'], $renglon['medida'], $renglon['marca'],
                    $renglon['familia'], $renglon['subfamilia'], $renglon['precioGranel'], $renglon['cantidad'],
                    $d['modoVenta'], $d['bultos'], $renglon['unidadGranel'], $renglon['unidadFraccion'], $d['descuentoItem'], $d['ivaPorcentaje'],
                    $d['precioLista'], $d['descAjusteFamilia'],
                    $d['descPago1'], $d['descPago2'], $d['descCliente'], $d['precioNeto'],
                ]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonError($e->getMessage(), 400);
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
    $soloFamilias = familiaPermitida($pdo, $auth);

    // De a tandas: traer el historial entero con todos sus renglones era
    // barato con veinte pedidos y deja de serlo solo, sin que nadie lo note.
    $limite = min(max((int) ($_GET['limite'] ?? 50), 1), 200);
    $desde = max((int) ($_GET['desde'] ?? 0), 0);

    $estado = $_GET['estado'] ?? '';
    if ($estado !== '') {
        $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE estado = ? ORDER BY fechaCreacion DESC LIMIT ? OFFSET ?');
        $stmt->bindValue(1, $estado);
        $stmt->bindValue(2, $limite, PDO::PARAM_INT);
        $stmt->bindValue(3, $desde, PDO::PARAM_INT);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM aprobaciones ORDER BY fechaCreacion DESC LIMIT ? OFFSET ?');
        $stmt->bindValue(1, $limite, PDO::PARAM_INT);
        $stmt->bindValue(2, $desde, PDO::PARAM_INT);
    }
    $stmt->execute();

    $pedidos = ensamblarVarios($pdo, $stmt->fetchAll(), $soloFamilias);

    // Al responsable de un depósito no le mostramos pedidos que no lo involucran
    if ($soloFamilias !== null) {
        $pedidos = array_values(array_filter($pedidos, fn($p) => !empty($p['subpedidos'])));
    }

    jsonSalida($pedidos);
}

function rutaAprobacionesObtener(string $id): void
{
    $auth = requireAuth();
    $pdo = obtenerPDO();
    $soloFamilias = familiaPermitida($pdo, $auth);

    $stmt = $pdo->prepare('SELECT * FROM aprobaciones WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) jsonError('No encontrado', 404);

    $pedido = ensamblarPedido($pdo, $row, $soloFamilias);
    if ($soloFamilias !== null && empty($pedido['subpedidos'])) {
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

    $soloFamilias = familiaPermitida($pdo, $auth);
    if ($soloFamilias !== null && !in_array($item['familia'], $soloFamilias, true)) {
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

            // El precio lo pone el catálogo, igual que al crear el pedido.
            $delCatalogo = catalogoDelPedido($pdo, [$reemplazo])[$reemplazo['codigo'] ?? ''] ?? null;
            $reemplazo['precioGranel'] = (float) (
                $delCatalogo['precioGranel'] ?? $reemplazo['precioGranel'] ?? $reemplazo['precio'] ?? 0
            );
            $reemplazo['ivaPorcentaje'] = (float) ($delCatalogo['ivaPorcentaje'] ?? $reemplazo['ivaPorcentaje'] ?? 21);

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
                  precioLista, descAjusteFamilia, descPago1, descPago2, descCliente, precioNeto, ivaPorcentaje)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reemplazo', ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )->execute([
                $item['subpedidoId'],
                $reemplazo['codigo'] ?? null,
                $reemplazo['descripcion'],
                $reemplazo['medida'] ?? null,
                $reemplazo['marca'] ?? null,
                $item['familia'],
                $reemplazo['subfamilia'] ?? null,
                $reemplazo['precioGranel'],
                $reemplazo['cantidad'] ?? $item['cantidad'],
                $reemplazo['cantidad'] ?? $item['cantidad'],
                $itemId,
                'Reemplaza a ' . ($item['codigo'] ?: $item['descripcion']),
                $d['precioLista'], $d['descAjusteFamilia'],
                $d['descPago1'], $d['descPago2'], $d['descCliente'], $d['precioNeto'], $d['ivaPorcentaje'],
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
    $soloFamilias = familiaPermitida($pdo, $auth);
    if ($soloFamilias !== null && !in_array($familia, $soloFamilias, true)) {
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

    jsonSalida(buscarPorId($pdo, $id, $soloFamilias));
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

    // Mandarle la cotización al cliente es una atribución comercial: el
    // depósito aprueba stock, no habla con el cliente.
    $puedeEnviar = ($auth['rol'] ?? '') === 'Administrador'
        || !empty($auth['permisos']['puedeEnviarCliente']);
    if (!$puedeEnviar) jsonError('No tenés permiso para enviar cotizaciones al cliente', 403);

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

/**
 * PUT /aprobaciones/:id/bultos — en cuántos bultos se despacha el pedido.
 *
 * Lo carga el depósito al terminar de preparar. Se puede corregir mientras el
 * pedido no esté confirmado; después queda fijo porque el remito ya salió.
 */
function rutaAprobacionesBultos(string $id): void
{
    $auth = requireAuth();
    requireRole($auth, ['Deposito', 'Administrador']);

    $body = cuerpoJson();
    $bruto = $body['bultos'] ?? null;

    // Vaciar el campo es válido: se cuentan mal y se borra para volver a contar.
    if ($bruto === null || $bruto === '') {
        $bultos = null;
    } else {
        if (!is_numeric($bruto)) jsonError('Los bultos tienen que ser un número', 400);
        $bultos = (int) $bruto;
        if ($bultos < 0) jsonError('Los bultos no pueden ser negativos', 400);
        if ($bultos > 9999) jsonError('Revisá el número de bultos, parece demasiado alto', 400);
    }

    $pdo = obtenerPDO();

    $stmt = $pdo->prepare('SELECT estado, bultos FROM aprobaciones WHERE id = ?');
    $stmt->execute([$id]);
    $actual = $stmt->fetch();
    if (!$actual) jsonError('No encontrado', 404);

    if ($actual['estado'] === 'confirmado') {
        jsonError('El pedido ya está confirmado, no se pueden cambiar los bultos', 409);
    }

    $pdo->prepare('UPDATE aprobaciones SET bultos = ? WHERE id = ?')->execute([$bultos, $id]);

    if ((string) $actual['bultos'] !== (string) $bultos) {
        registrarEvento($pdo, $id, 'bultos', [
            'usuarioId' => $auth['id'],
            'usuarioNombre' => nombreUsuario($pdo, $auth['id']),
            'detalle' => $bultos === null
                ? 'Se borró la cantidad de bultos'
                : "Se registraron $bultos bulto" . ($bultos === 1 ? '' : 's'),
        ]);
    }

    jsonSalida(buscarPorId($pdo, $id, familiaPermitida($pdo, $auth)));
}

/** GET /aprobaciones/:id/log — historial completo del pedido. */
function rutaAprobacionesLog(string $id): void
{
    $auth = requireAuth();
    $pdo = obtenerPDO();

    // El historial cuenta precios y descuentos: el responsable de un depósito
    // sólo puede leer el de los pedidos en los que trabaja.
    $soloFamilias = familiaPermitida($pdo, $auth);
    if ($soloFamilias !== null) {
        $suyo = false;
        if ($soloFamilias) {
            $stmt = $pdo->prepare(
                'SELECT COUNT(*) FROM aprobaciones_subpedidos WHERE aprobacionId = ? AND familia IN ('
                . implode(',', array_fill(0, count($soloFamilias), '?')) . ')'
            );
            $stmt->execute(array_merge([$id], $soloFamilias));
            $suyo = (int) $stmt->fetchColumn() > 0;
        }
        if (!$suyo) jsonError('Este pedido no tiene productos de tu depósito', 403);
    }

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
