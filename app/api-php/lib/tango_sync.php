<?php
/**
 * Copia de los artículos de Tango en la tabla `productos` de la app.
 *
 * Preguntarle a Tango en cada búsqueda es lento (cada consulta tarda entre 2 y
 * 12 segundos y el catálogo pasa de 6.000 artículos). En cambio, con el
 * catálogo copiado en la base propia la búsqueda es inmediata, y el precio y
 * el stock ya quedan guardados para cuando el pedido pasa a la etapa siguiente.
 *
 * Reglas de la copia:
 *   - Un artículo NUEVO se inserta entero: código, nombre, medida, familia, IVA.
 *   - Uno que YA está no se pisa: su nombre, medida, familia, fracción y granel
 *     son datos curados de la app (Tango no tiene fracción ni granel). Sólo se
 *     actualizan lo que Tango sabe mejor: IVA, precio y stock.
 */

require_once __DIR__ . '/tango_datos.php';
require_once __DIR__ . '/tango.php';

/** Tolsen lleva TOL adelante en Tango y no en la app (es el camino inverso de codigoArticuloTango). */
function codigoAppDeTango(string $codigoTango, string $familia): string
{
    if ($familia === 'tolsen' && str_starts_with($codigoTango, 'TOL')) return substr($codigoTango, 3);
    return $codigoTango;
}

/**
 * La lista de precios de venta de Tango que usa la app. Por defecto la 65
 * ("LISTA CLIENTES"), que es la de todos los clientes y la que coincide
 * centavo por centavo con los precios que la app ya tenía. Se cambia con la
 * clave `tangoListaPrecios` de la tabla config cuando Tango estrene otra lista.
 */
const TANGO_LISTA_PRECIOS_POR_DEFECTO = 65;

function listaDePreciosTango(PDO $pdo): int
{
    $stmt = $pdo->prepare("SELECT valor FROM config WHERE clave = 'tangoListaPrecios'");
    $stmt->execute();
    $n = (int) $stmt->fetchColumn();
    return $n > 0 ? $n : TANGO_LISTA_PRECIOS_POR_DEFECTO;
}

/**
 * Precio de venta de cada artículo en la lista, leído de Tango en tandas y en
 * paralelo (150 códigos por consulta: el filtro viaja en la dirección).
 *
 * @param string[] $codigos códigos de Tango
 * @return array<string,float> código de Tango => precio
 */
function preciosDeArticulosTango(TangoApi $api, array $codigos, int $lista): array
{
    $codigos = array_values(array_unique(array_filter($codigos, fn($c) => $c !== '')));
    if (!$codigos) return [];

    $filtros = [];
    foreach (array_chunk($codigos, 150) as $i => $tanda) {
        $filtros["t$i"] = 'NRO_DE_LIS = ' . (int) $lista . ' AND COD_STA11 IN ('
            . implode(',', array_map(fn($c) => TangoApi::literalSql($c), $tanda)) . ')';
    }

    $precios = [];
    foreach ($api->filtrarEnParalelo($api->proceso('precios'), $filtros) as $r) {
        if ($r instanceof TangoApiException) throw $r;
        foreach ($r as $fila) {
            $precio = (float) ($fila['PRECIO'] ?? 0);
            if ($precio > 0) $precios[trim((string) $fila['COD_STA11'])] = $precio;
        }
    }
    return $precios;
}

/** Lo que se sabe de precio (y stock, cuando se lea) de cada artículo: código de Tango => ['precioLista' => ...]. */
function extrasDeArticulos(PDO $pdo, TangoApi $api, array $articulos): array
{
    $precios = preciosDeArticulosTango($api, array_column($articulos, 'codigo'), listaDePreciosTango($pdo));
    $extras = [];
    foreach ($precios as $codigo => $precio) $extras[$codigo] = ['precioLista' => $precio];
    return $extras;
}

/**
 * Cómo clasificar un artículo nuevo que Tango no trae clasificado (su FAMILIA
 * viene vacía): se copia lo que la app ya hace con los códigos parecidos. Los
 * artículos de un mismo rubro comparten los primeros 3 dígitos del código
 * (504… bulones, 523… tornillos, 90… mechas), así que se toma la familia y el
 * grupo de descuento que tiene la gran mayoría de los productos con ese prefijo.
 * Sin códigos parecidos, se mira el nombre; si tampoco alcanza, queda en 'otros'.
 *
 * @return array [familia, grupoDescuento]
 */
function clasificarArticuloNuevo(PDO $pdo, string $codigoApp, string $descripcion): array
{
    static $reglas = null;
    if ($reglas === null) {
        $porPrefijo = [];
        $filas = $pdo->query("SELECT codigo, familia, grupoDescuento FROM productos WHERE familia <> 'otros' AND codigo REGEXP '^[0-9]{6,8}\$'")->fetchAll();
        foreach ($filas as $f) {
            $pre = substr(str_pad($f['codigo'], 8, '0', STR_PAD_LEFT), 0, 3);
            $k = $f['familia'] . '|' . $f['grupoDescuento'];
            $porPrefijo[$pre][$k] = ($porPrefijo[$pre][$k] ?? 0) + 1;
        }
        $reglas = [];
        foreach ($porPrefijo as $pre => $cuentas) {
            arsort($cuentas);
            $total = array_sum($cuentas);
            $mejor = array_key_first($cuentas);
            if ($total >= 3 && $cuentas[$mejor] / $total >= 0.9) $reglas[$pre] = explode('|', $mejor);
        }
    }

    if (ctype_digit($codigoApp)) {
        $pre = substr(str_pad($codigoApp, 8, '0', STR_PAD_LEFT), 0, 3);
        if (isset($reglas[$pre])) return $reglas[$pre];
    }
    $d = mb_strtoupper($descripcion);
    if (preg_match('/(TORN|AUTOP|ALLEN|PARKER|FIXER|CHAPISTA|GUSANILLO)/u', $d)) return ['buloneria', 'tor'];
    if (preg_match('/(BULON|BULÓN|BUL\.|\bBUL\b|TCA\.|TCAS|TUERCA|CUCHILLA)/u', $d)) return ['buloneria', 'bul'];
    if (preg_match('/(ARAND|VARILLA|TIRAFONDO|ANCLAJE|CHAVETA|PERNO)/u', $d)) return ['buloneria', 'var'];
    return ['otros', 'var'];
}

/**
 * Guarda una tanda de artículos de Tango (ya en la forma de articuloDesdeTango).
 *
 * @param bool  $sinPrecioOk  guarda también los nuevos que no tienen precio en la lista (cuando alguien los eligió a mano)
 * @param bool  $simular  cuenta lo que haría pero no deja nada guardado
 * @param array $extras  código de Tango => ['precioLista' => ?float, 'stock' => ?int]; lo que se sepa de precio y stock
 * @return array ['nuevos' => n, 'actualizados' => n, 'omitidos' => n]
 */
function guardarArticulosTango(PDO $pdo, array $articulos, array $mapaFamilias = [], array $extras = [], bool $simular = false, bool $sinPrecioOk = false): array
{
    $cuenta = ['nuevos' => 0, 'actualizados' => 0, 'omitidos' => 0];
    $articulos = array_values(array_filter($articulos, fn($a) => $a['codigo'] !== '' && $a['descripcion'] !== ''));
    if (!$articulos) return $cuenta;

    // Los que la app ya tiene, de una sola consulta.
    $candidatos = array_values(array_unique(array_merge(...array_map(fn($a) => codigosAppDeArticulo($a['codigo']), $articulos))));
    $existentes = [];
    foreach (array_chunk($candidatos, 500) as $tanda) {
        $stmt = $pdo->prepare('SELECT id, codigo FROM productos WHERE codigo IN (' . implode(',', array_fill(0, count($tanda), '?')) . ')');
        $stmt->execute($tanda);
        foreach ($stmt->fetchAll() as $f) $existentes[$f['codigo']] = (int) $f['id'];
    }

    $insertar = $pdo->prepare(
        'INSERT INTO productos (codigo, descripcion, medida, familia, grupoDescuento, ivaPorcentaje, precioLista, precioGranel, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $pdo->beginTransaction();
    try {
        foreach ($articulos as $a) {
            $extra = $extras[$a['codigo']] ?? [];
            $precio = isset($extra['precioLista']) && $extra['precioLista'] > 0 ? (float) $extra['precioLista'] : null;
            $stock = isset($extra['stock']) ? (int) round((float) $extra['stock']) : null;

            $id = null;
            foreach (codigosAppDeArticulo($a['codigo']) as $c) {
                if (isset($existentes[$c])) { $id = $existentes[$c]; break; }
            }

            if ($id !== null) {
                $sets = [];
                $vals = [];
                if ($a['ivaPorcentaje'] !== null) { $sets[] = 'ivaPorcentaje = ?'; $vals[] = $a['ivaPorcentaje']; }
                if ($precio !== null) { $sets[] = 'precioLista = ?'; $vals[] = $precio; }
                if ($stock !== null) { $sets[] = 'stock = ?'; $vals[] = $stock; }
                if (!$sets) { $cuenta['omitidos']++; continue; }
                $vals[] = $id;
                $pdo->prepare('UPDATE productos SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
                $cuenta['actualizados']++;
            } elseif ($precio === null && !$sinPrecioOk) {
                // Un artículo nuevo sin precio en la lista no se puede vender: se deja afuera.
                $cuenta['omitidos']++;
            } else {
                $familia = familiaDeLaApp($a['codigo'], $a['familiaTango'], $mapaFamilias);
                $codigoApp = codigoAppDeTango($a['codigo'], $familia);
                $grupo = $familia === 'tolsen' ? 'tol' : 'var';
                if ($familia === 'otros') [$familia, $grupo] = clasificarArticuloNuevo($pdo, $codigoApp, $a['descripcion']);
                $insertar->execute([
                    $codigoApp,
                    mb_substr($a['descripcion'], 0, 255),
                    $a['medida'] !== '' ? $a['medida'] : null,
                    $familia,
                    $grupo,
                    $a['ivaPorcentaje'] ?? 21,
                    $precio,
                    // Sin dato de granel en Tango: el precio por unidad es el mismo hasta que se cargue otro.
                    $precio,
                    $stock,
                ]);
                $cuenta['nuevos']++;
            }
        }
        $simular ? $pdo->rollBack() : $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return $cuenta;
}

/** El estado de la última sincronización, guardado en config. */
function estadoSincronizacion(PDO $pdo): array
{
    $stmt = $pdo->prepare("SELECT valor FROM config WHERE clave = 'tangoSincronizacion'");
    $stmt->execute();
    $e = json_decode((string) $stmt->fetchColumn(), true);
    return is_array($e) ? $e : [];
}

function guardarEstadoSincronizacion(PDO $pdo, array $estado): void
{
    $pdo->prepare("INSERT INTO config (clave, valor) VALUES ('tangoSincronizacion', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)")
        ->execute([json_encode($estado, JSON_UNESCAPED_UNICODE)]);
}

/**
 * Lee y guarda UNA página de artículos de Tango. Se llama una y otra vez hasta
 * que `fin` sea true: así cada llamada es corta, sirva desde la pantalla (que
 * tiene un tope de tiempo) o desde una tarea programada.
 *
 * @return array ['pagina','leidos','nuevos','actualizados','omitidos','fin']
 */
function sincronizarPaginaArticulos(PDO $pdo, TangoApi $api, int $pagina, int $tam = 500, bool $simular = false): array
{
    $filas = $api->listar($api->proceso('articulos'), $tam, $pagina);
    $articulos = array_map('articuloDesdeTango', $filas);
    $extras = extrasDeArticulos($pdo, $api, $articulos);

    $mapa = [];
    $stmt = $pdo->prepare("SELECT valor FROM config WHERE clave = 'tangoFamilias'");
    $stmt->execute();
    $m = json_decode((string) $stmt->fetchColumn(), true);
    if (is_array($m)) $mapa = $m;

    $r = guardarArticulosTango($pdo, $articulos, $mapa, $extras, $simular);
    return ['pagina' => $pagina, 'leidos' => count($filas), 'fin' => count($filas) < $tam] + $r;
}
