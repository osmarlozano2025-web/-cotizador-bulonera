<?php
/**
 * Clientes y artículos leídos de Tango, acomodados a la forma que usa la app.
 *
 * Tango es quien sabe quién es el cliente y qué es el artículo: razón social,
 * CUIT, domicilio, condición de venta, vendedor, lista, transporte y descuento
 * del cliente; código, descripción y familia del artículo. La app guarda sólo
 * lo que Tango no tiene — fracción y granel, descuentos por familia, cuentas
 * de clientes — atado al código de Tango, y acá se lo suma encima.
 *
 * Los nombres de campo son los del repo oficial (ClienteQueryRecord y
 * ArticuloQueryRecord) y los filtros usan las tablas del ejemplo oficial
 * (AXV_CLIENTE, AXV_ARTICULO). Que el Tango de la bulonera use esos mismos
 * nombres no está probado hasta la primera consulta real: para mirarlo sin
 * tocar código está GET /integraciones/tango/explorar.
 */

require_once __DIR__ . '/tango_api.php';

/** Lo mínimo que hay que escribir para buscar: con menos, Tango devolvería media base. */
const TANGO_MINIMO_BUSQUEDA = 3;

/**
 * Un texto listo para un LIKE de SQL Server (la base de Tango): comillas
 * duplicadas y los comodines del usuario escapados, para que "10%" busque
 * "10%" y no "10 seguido de cualquier cosa".
 */
function likeTango(string $texto, bool $soloAlPrincipio = false): string
{
    $escapado = strtr($texto, ['[' => '[[]', '%' => '[%]', '_' => '[_]']);
    return TangoApi::literalSql(($soloAlPrincipio ? '' : '%') . $escapado . '%');
}

/** Las palabras de una búsqueda, sin vacíos ni repetidas. */
function palabrasBusqueda(string $texto): array
{
    return array_values(array_unique(preg_split('/\s+/u', trim($texto), -1, PREG_SPLIT_NO_EMPTY) ?: []));
}

/** El CUIT con guiones, como lo guarda Tango (30-12345678-9), si lo escrito son 11 dígitos. */
function cuitConGuiones(string $texto): ?string
{
    $digitos = preg_replace('/\D/', '', $texto);
    if (strlen($digitos) !== 11) return null;
    return substr($digitos, 0, 2) . '-' . substr($digitos, 2, 8) . '-' . substr($digitos, 10);
}

/** Tango rellena los textos con espacios a la derecha: se recortan siempre. */
function textoTango($valor): string
{
    return trim((string) ($valor ?? ''));
}

/**
 * Clientes de Tango que coinciden con lo escrito: por código, por CUIT (con o
 * sin guiones) o por nombre — razón social o nombre comercial, y todas las
 * palabras tienen que estar.
 */
function buscarClientesTango(TangoApi $api, string $texto, int $limite = 20): array
{
    $texto = trim($texto);
    if (mb_strlen($texto) < TANGO_MINIMO_BUSQUEDA) return [];

    $condiciones = ['AXV_CLIENTE.COD_GVA14 LIKE ' . likeTango($texto, true)];
    $cuit = cuitConGuiones($texto);
    if ($cuit) $condiciones[] = 'AXV_CLIENTE.CUIT = ' . TangoApi::literalSql($cuit);
    $porNombre = array_map(
        fn($p) => '(AXV_CLIENTE.RAZON_SOCI LIKE ' . likeTango($p) . ' OR AXV_CLIENTE.NOM_COM LIKE ' . likeTango($p) . ')',
        palabrasBusqueda($texto)
    );
    $condiciones[] = '(' . implode(' AND ', $porNombre) . ')';

    $filas = $api->filtrar($api->proceso('clientes'), implode(' OR ', $condiciones));
    return array_map('clienteDesdeTango', array_slice($filas, 0, $limite));
}

/** Una fila de cliente de Tango, en la forma de la app. */
function clienteDesdeTango(array $c): array
{
    // Condición, vendedor, lista y transporte van como código + nombre: el
    // código es lo que se manda de vuelta a Tango, el nombre lo que se lee.
    $par = function ($codigo, $nombre): ?array {
        $codigo = textoTango($codigo);
        $nombre = textoTango($nombre);
        return $codigo === '' && $nombre === '' ? null : ['codigo' => $codigo, 'nombre' => $nombre];
    };
    $razonSocial = textoTango($c['RAZON_SOCI'] ?? '');

    return [
        'codigoCliente' => textoTango($c['COD_GVA14'] ?? ''),
        'idTango' => isset($c['ID_GVA14']) ? (int) $c['ID_GVA14'] : null,
        'razonSocial' => $razonSocial,
        'nombre' => textoTango($c['NOM_COM'] ?? '') ?: $razonSocial,
        'cuit' => textoTango($c['CUIT'] ?? ''),
        'domicilio' => textoTango($c['DOMICILIO'] ?? ''),
        'localidad' => textoTango($c['LOCALIDAD'] ?? ''),
        'codigoPostal' => textoTango($c['C_POSTAL'] ?? ''),
        'provincia' => textoTango($c['GVA18_DESCRIPCION'] ?? ''),
        'telefono' => textoTango($c['TELEFONO_1'] ?? '') ?: textoTango($c['TELEFONO_MOVIL'] ?? ''),
        'email' => textoTango($c['E_MAIL'] ?? ''),
        'condicionVenta' => $par($c['GVA01_COND_VTA'] ?? '', $c['GVA01_DESC_COND'] ?? ''),
        'vendedor' => $par($c['GVA23_CODIGO'] ?? '', $c['GVA23_DESCRIPCION'] ?? ''),
        'listaPrecios' => $par($c['GVA10_NRO_DE_LIS'] ?? '', $c['GVA10_NOMBRE_LIS'] ?? ''),
        'transporte' => $par($c['GVA24_CODIGO'] ?? '', $c['GVA24_DESCRIPCION'] ?? ''),
        'descuento' => (float) ($c['PORC_DESC'] ?? 0),
        'habilitado' => (bool) ($c['HABILITADO'] ?? true),
    ];
}

/**
 * Artículos de Tango que coinciden con lo escrito: por código (en cualquier
 * parte, así "79005" encuentra "TOL79005") o por descripción, descripción
 * adicional o sinónimo, con todas las palabras.
 */
function buscarArticulosTango(TangoApi $api, string $texto, int $limite = 30): array
{
    $texto = trim($texto);
    if (mb_strlen($texto) < TANGO_MINIMO_BUSQUEDA) return [];

    $porDescripcion = array_map(
        fn($p) => '(AXV_ARTICULO.DESCRIPCIO LIKE ' . likeTango($p)
            . ' OR AXV_ARTICULO.DESC_ADIC LIKE ' . likeTango($p)
            . ' OR AXV_ARTICULO.SINONIMO LIKE ' . likeTango($p) . ')',
        palabrasBusqueda($texto)
    );
    $donde = 'AXV_ARTICULO.COD_STA11 LIKE ' . likeTango($texto) . ' OR (' . implode(' AND ', $porDescripcion) . ')';

    $filas = $api->filtrar($api->proceso('articulos'), $donde);
    return array_map('articuloDesdeTango', array_slice($filas, 0, $limite));
}

/** El porcentaje de IVA a partir del nombre de la alícuota de Tango ("IVA 21%", "10,5 %"). */
function ivaDesdeTango(?string $descripcion): ?float
{
    if (!preg_match('/(\d+(?:[.,]\d+)?)\s*%/', (string) $descripcion, $m)) return null;
    return (float) str_replace(',', '.', $m[1]);
}

/** Una fila de artículo de Tango, en la forma de la app. */
function articuloDesdeTango(array $a): array
{
    return [
        'codigo' => textoTango($a['COD_STA11'] ?? ''),
        'idTango' => isset($a['ID_STA11']) ? (int) $a['ID_STA11'] : null,
        'descripcion' => textoTango($a['DESCRIPCIO'] ?? ''),
        'medida' => textoTango($a['DESC_ADIC'] ?? ''),
        'familiaTango' => textoTango($a['FAMILIA'] ?? ''),
        'grupoTango' => textoTango($a['GRUPO'] ?? ''),
        'ivaPorcentaje' => ivaDesdeTango($a['GVA41_DESC_IVA'] ?? null),
        'unidad' => textoTango($a['MEDIDA_VENTAS_DESCRIPCION'] ?? ''),
        'llevaStock' => (bool) ($a['STOCK'] ?? false),
    ];
}

/**
 * Los códigos con los que la app pudo haber guardado un artículo de Tango:
 * el mismo, sin el TOL de Tolsen o sin los ceros de adelante. Es el camino
 * inverso de codigoArticuloTango().
 */
function codigosAppDeArticulo(string $codigoTango): array
{
    $codigos = [$codigoTango];
    if (str_starts_with($codigoTango, 'TOL')) $codigos[] = substr($codigoTango, 3);
    if (ctype_digit($codigoTango)) $codigos[] = ltrim($codigoTango, '0');
    return array_values(array_unique(array_filter($codigos, fn($c) => $c !== '')));
}

/**
 * La familia de la app para un artículo que la app todavía no tiene: Tolsen
 * por el prefijo, o la que diga el mapa familia de Tango → familia de la app
 * (clave tangoFamilias en Integraciones). Si no hay forma de saberlo, 'otros'.
 */
function familiaDeLaApp(string $codigoTango, string $familiaTango, array $mapa): string
{
    if (str_starts_with($codigoTango, 'TOL')) return 'tolsen';
    return $mapa[$familiaTango] ?? 'otros';
}

/**
 * Suma a cada artículo de Tango lo que sólo sabe la app: su familia, la
 * fracción, el granel, el grupo de descuento y — hasta que el precio se lea
 * de la lista de Tango — el precio de lista que tiene cargado. El IVA manda
 * el de Tango; si no se pudo leer, el de la app.
 */
function completarArticulosConLaApp(PDO $pdo, array $articulos, array $mapaFamilias = []): array
{
    if (!$articulos) return [];

    $candidatos = array_merge(...array_map(fn($a) => codigosAppDeArticulo($a['codigo']), $articulos));
    $stmt = $pdo->prepare('SELECT * FROM productos WHERE codigo IN (' . implode(',', array_fill(0, count($candidatos), '?')) . ')');
    $stmt->execute($candidatos);
    $propios = array_column($stmt->fetchAll(), null, 'codigo');

    return array_map(function (array $a) use ($propios, $mapaFamilias) {
        $propio = null;
        foreach (codigosAppDeArticulo($a['codigo']) as $codigo) {
            if (isset($propios[$codigo])) { $propio = $propios[$codigo]; break; }
        }
        $numero = fn($v) => $v === null || $v === '' ? null : (float) $v;

        $a['ivaPorcentaje'] ??= $numero($propio['ivaPorcentaje'] ?? null);
        return $a + [
            'enLaApp' => $propio !== null,
            'familia' => $propio['familia'] ?? familiaDeLaApp($a['codigo'], $a['familiaTango'], $mapaFamilias),
            'unidadGranel' => $numero($propio['unidadGranel'] ?? null),
            'unidadFraccion' => $numero($propio['unidadFraccion'] ?? null),
            'grupoDescuento' => $propio['grupoDescuento'] ?? null,
            'precioLista' => $numero($propio['precioLista'] ?? null),
            'stock' => null,
        ];
    }, $articulos);
}

/**
 * Suma a cada cliente de Tango lo que sólo sabe la app: su ficha (el id con el
 * que se guardan los pedidos), los descuentos por familia y si ya tiene cuenta
 * para entrar a la app.
 */
function completarClientesConLaApp(PDO $pdo, array $clientes): array
{
    if (!$clientes) return [];

    $codigos = array_column($clientes, 'codigoCliente');
    $stmt = $pdo->prepare(
        'SELECT id, codigoCliente, descBulGranel, descBulFraccion, descTorGranel, descTorFraccion, descVar, descTol,
                passwordHash IS NOT NULL AS tieneCuenta
         FROM clientes WHERE codigoCliente IN (' . implode(',', array_fill(0, count($codigos), '?')) . ')'
    );
    $stmt->execute($codigos);
    $propios = array_column($stmt->fetchAll(), null, 'codigoCliente');

    return array_map(function (array $c) use ($propios) {
        $propio = $propios[$c['codigoCliente']] ?? null;
        $descuentosFamilia = [];
        foreach (['descBulGranel', 'descBulFraccion', 'descTorGranel', 'descTorFraccion', 'descVar', 'descTol'] as $campo) {
            if (isset($propio[$campo])) $descuentosFamilia[$campo] = (float) $propio[$campo];
        }
        return $c + [
            'id' => $propio['id'] ?? null,
            'enLaApp' => $propio !== null,
            'descuentosFamilia' => $descuentosFamilia,
            'tieneCuenta' => (bool) ($propio['tieneCuenta'] ?? false),
        ];
    }, $clientes);
}
