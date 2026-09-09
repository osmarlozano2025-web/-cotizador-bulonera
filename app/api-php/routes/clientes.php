<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/response.php';

function castTipoDescuento(array $t): array
{
    $t['porcentaje'] = (float) $t['porcentaje'];
    return $t;
}

function castCliente(array $c): array
{
    $c['descuento'] = (float) $c['descuento'];
    return $c;
}

function rutaTiposDescuento(): void
{
    $pdo = obtenerPDO();
    $rows = $pdo->query('SELECT * FROM tipos_descuento ORDER BY porcentaje')->fetchAll();
    jsonSalida(array_map('castTipoDescuento', $rows));
}

function rutaClientesListar(): void
{
    $pdo = obtenerPDO();
    $q = $_GET['q'] ?? '';
    if ($q !== '') {
        $like = "%$q%";
        $stmt = $pdo->prepare('SELECT * FROM clientes WHERE nombre LIKE ? OR razonSocial LIKE ? OR localidad LIKE ? ORDER BY nombre');
        $stmt->execute([$like, $like, $like]);
    } else {
        $stmt = $pdo->query('SELECT * FROM clientes ORDER BY nombre');
    }
    jsonSalida(array_map('castCliente', $stmt->fetchAll()));
}

function rutaClientesObtener(string $id): void
{
    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM clientes WHERE id = ?');
    $stmt->execute([$id]);
    $c = $stmt->fetch();
    if (!$c) jsonError('No encontrado', 404);
    jsonSalida(castCliente($c));
}

function rutaClientesCrear(): void
{
    $body = cuerpoJson();
    $pdo = obtenerPDO();

    $tipos = $pdo->query('SELECT * FROM tipos_descuento')->fetchAll();
    $tipo = null;
    foreach ($tipos as $t) if ($t['codigo'] === ($body['tipoDescuento'] ?? null)) $tipo = $t;
    if (!$tipo) $tipo = $tipos[0] ?? null;

    $id = (string) round(microtime(true) * 1000);
    $nuevo = [
        'id' => $id,
        'nombre' => $body['nombre'] ?? '',
        'razonSocial' => $body['razonSocial'] ?? '',
        'cuit' => $body['cuit'] ?? '',
        'telefono' => $body['telefono'] ?? '',
        'email' => $body['email'] ?? '',
        'localidad' => $body['localidad'] ?? '',
        'provincia' => $body['provincia'] ?? '',
        'tipoDescuento' => $tipo['codigo'] ?? null,
        'descuento' => (float) ($tipo['porcentaje'] ?? 0),
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO clientes (id, nombre, razonSocial, cuit, telefono, email, localidad, provincia, tipoDescuento, descuento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute(array_values($nuevo));
    jsonSalida($nuevo, 201);
}

function rutaClientesActualizar(string $id): void
{
    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT * FROM clientes WHERE id = ?');
    $stmt->execute([$id]);
    $actual = $stmt->fetch();
    if (!$actual) jsonError('No encontrado', 404);

    $body = cuerpoJson();
    $tipo = null;
    if (isset($body['tipoDescuento'])) {
        $tstmt = $pdo->prepare('SELECT * FROM tipos_descuento WHERE codigo = ?');
        $tstmt->execute([$body['tipoDescuento']]);
        $tipo = $tstmt->fetch();
    }

    $datos = [
        'nombre' => $body['nombre'] ?? $actual['nombre'],
        'razonSocial' => $body['razonSocial'] ?? $actual['razonSocial'],
        'cuit' => $body['cuit'] ?? $actual['cuit'],
        'telefono' => $body['telefono'] ?? $actual['telefono'],
        'email' => $body['email'] ?? $actual['email'],
        'localidad' => $body['localidad'] ?? $actual['localidad'],
        'provincia' => $body['provincia'] ?? $actual['provincia'],
        'tipoDescuento' => $body['tipoDescuento'] ?? $actual['tipoDescuento'],
        'descuento' => (float) ($tipo ? $tipo['porcentaje'] : $actual['descuento']),
    ];

    $stmt = $pdo->prepare(
        'UPDATE clientes SET nombre=?, razonSocial=?, cuit=?, telefono=?, email=?, localidad=?, provincia=?, tipoDescuento=?, descuento=? WHERE id=?'
    );
    $stmt->execute([...array_values($datos), $id]);
    jsonSalida(castCliente([...$actual, ...$datos, 'id' => $id]));
}

function rutaClientesEliminar(string $id): void
{
    $pdo = obtenerPDO();
    $pdo->prepare('DELETE FROM clientes WHERE id = ?')->execute([$id]);
    jsonSalida(['ok' => true]);
}
