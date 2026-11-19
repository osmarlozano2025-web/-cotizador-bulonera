<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/openai.php';

/** Lo que se le puede mandar a OpenAI, y hasta qué tamaño. */
const IMAGEN_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const IMAGEN_MAX_BYTES = 8 * 1024 * 1024;

function castProducto(array $p): array
{
    foreach (['unidadGranel', 'unidadFraccion', 'precioLista', 'precioGranel'] as $campo) {
        if (isset($p[$campo])) $p[$campo] = (float) $p[$campo];
    }
    if (isset($p['stock'])) $p['stock'] = (int) $p['stock'];
    return $p;
}

/**
 * Lo tecleado, en la sintaxis del índice de texto completo.
 *
 * "buloneria tor" se vuelve "+buloneria* +tor*": las dos palabras tienen que
 * estar y cada una puede seguir. Devuelve vacío si no quedó nada aprovechable
 * — palabras de una o dos letras no entran en el índice.
 */
function expresionFullText(string $q): string
{
    $limpio = preg_replace('/[+\-><()~*"@]+/u', ' ', $q);
    $palabras = preg_split('/\s+/u', trim($limpio), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $utiles = array_filter($palabras, fn($p) => mb_strlen($p) >= 3);
    return $utiles ? implode(' ', array_map(fn($p) => "+$p*", $utiles)) : '';
}

function rutaProductosBuscar(): void
{
    requireAuth();
    $q = trim($_GET['q'] ?? '');
    $familia = $_GET['familia'] ?? '';
    $pdo = obtenerPDO();

    // Sin texto para buscar: si se eligió una familia, se lista lo que tiene
    // esa familia en vez de no mostrar nada — así se puede elegir de una
    // lista sin tener que escribir el código o la descripción de memoria.
    if (mb_strlen($q) < 2) {
        if ($familia === '') jsonSalida([]);
        $stmt = $pdo->prepare('SELECT * FROM productos WHERE familia = ? ORDER BY descripcion LIMIT 30');
        $stmt->execute([$familia]);
        jsonSalida(array_map('castProducto', $stmt->fetchAll()));
    }

    $filtroFamilia = $familia !== '' ? ' AND familia = ?' : '';

    // El índice de texto completo evita recorrer los miles de productos en cada
    // tecla. No alcanza para fragmentos de dos letras ni para un pedazo suelto
    // en el medio de un código: eso lo sigue resolviendo el LIKE de abajo.
    $expresion = expresionFullText($q);
    if ($expresion !== '') {
        try {
            $params = [$expresion];
            if ($familia !== '') $params[] = $familia;
            $params[] = "$q%";

            $stmt = $pdo->prepare(
                'SELECT * FROM productos
                 WHERE MATCH(descripcion, codigo, medida) AGAINST (? IN BOOLEAN MODE)'
                 . $filtroFamilia .
                ' ORDER BY (descripcion LIKE ?) DESC, descripcion LIMIT 30'
            );
            $stmt->execute($params);
            $filas = $stmt->fetchAll();
            if ($filas) jsonSalida(array_map('castProducto', $filas));
        } catch (Throwable $e) {
            // Base sin el índice creado: seguimos por el camino largo.
            error_log('busqueda fulltext: ' . $e->getMessage());
        }
    }

    $like = "%$q%";
    $params = [$like, $like, $like];
    if ($familia !== '') $params[] = $familia;
    $params[] = "$q%";

    $stmt = $pdo->prepare(
        'SELECT * FROM productos
         WHERE (descripcion LIKE ? OR codigo LIKE ? OR medida LIKE ?)'
         . $filtroFamilia .
        ' ORDER BY (descripcion LIKE ?) DESC, descripcion LIMIT 30'
    );
    $stmt->execute($params);
    jsonSalida(array_map('castProducto', $stmt->fetchAll()));
}

function rutaProductosFamilias(): void
{
    requireAuth();
    $pdo = obtenerPDO();
    $rows = $pdo->query('SELECT DISTINCT familia FROM productos WHERE familia IS NOT NULL AND familia != ""')->fetchAll();
    jsonSalida(array_column($rows, 'familia'));
}

/** Tope de consultas y de tiempo en Tango por foto: cada una es una espera por la red. */
const TANGO_FOTO_MAX_CONSULTAS = 30;
const TANGO_FOTO_SEGUNDOS = 45;
/** Artículos que se leen de Tango por consulta (un producto con muchas medidas trae cientos). */
const TANGO_FOTO_ARTICULOS = 600;

/**
 * Opciones de Tango para los renglones que el catálogo de la app no resuelve.
 *
 * Se consulta por el NOMBRE del producto y se compara la medida acá, por
 * números. Las consultas distintas se hacen todas a la vez, y la respuesta de
 * cada una queda guardada: seis renglones de "tirafondo" son una sola consulta
 * a Tango, no seis.
 *
 * Si el nombre solo trae demasiados artículos ("tornillo allen" son miles y
 * Tango tarda más de lo que se puede esperar), se vuelve a consultar sumando
 * un número de la medida, que achica la respuesta a lo que interesa. Cada
 * ronda es una tanda de consultas en paralelo.
 *
 * Si Tango no responde en absoluto se anota en $tango y se deja de intentar:
 * una espera por renglón haría la lectura eterna.
 *
 * @param array $pendientes  posición del renglón => ['item' => renglón leído, 'yaOfrecidos' => [código => true]]
 * @return array             posición del renglón => opciones de Tango (ya puntuadas)
 */
function opcionesDeTangoEnLote(PDO $pdo, array $pendientes, array &$tango): array
{
    if (!$pendientes || !$tango['disponible']) return [];

    require_once __DIR__ . '/../lib/tango_datos.php';
    require_once __DIR__ . '/../lib/busqueda_productos.php';

    // Por cada renglón, las consultas a probar: de la más general a la más angosta.
    $plan = [];
    foreach ($pendientes as $i => $p) {
        $item = $p['item'];
        $palabras = $item['codigo'] !== '' ? [$item['codigo']] : busqPalabrasConsulta($item);
        if (!$palabras) continue;
        $dos = implode(' ', $palabras);
        $una = $palabras[0];
        $numero = busqNumeroDeConsulta($item['medida']);
        $anchas = [$dos, $una];
        $angostas = $numero !== '' ? ["$dos $numero", "$una $numero"] : [];
        // Los productos que en Tango tienen miles de artículos (allen, bulones) tardan demasiado
        // en consultarse enteros: se empieza por la consulta angosta, con un número de la medida.
        $enormes = array_intersect($palabras, ['allen', 'bulon', 'tornillo', 'torn', 'tuerca', 'arandela']);
        $orden = $enormes && $angostas ? array_merge($angostas, $anchas) : array_merge($anchas, $angostas);
        $candidatas = array_values(array_unique(array_filter($orden, fn($t) => mb_strlen($t) >= TANGO_MINIMO_BUSQUEDA)));
        // Si una consulta resulta enorme, las que siguen sin número tampoco servirían: se salta a las angostas.
        $primeraAngosta = count($candidatas);
        foreach ($candidatas as $k => $c) if ($numero !== '' && str_ends_with($c, " $numero")) { $primeraAngosta = $k; break; }
        if ($candidatas) $plan[$i] = ['candidatas' => $candidatas, 'pos' => 0, 'articulos' => null, 'angosta' => $primeraAngosta];
    }

    try {
        if ($tango['api'] === null) $tango['api'] = TangoApi::desdeConfig($pdo, 12);
        $mapaFamilias = configJson($pdo, 'tangoFamilias');

        for ($ronda = 0; $ronda < 4; $ronda++) {
            // Lo que falta consultar en esta ronda, sin repetidos ni lo ya guardado.
            $faltan = [];
            foreach ($plan as $pl) {
                if ($pl['articulos'] !== null || $pl['pos'] >= count($pl['candidatas'])) continue;
                $t = $pl['candidatas'][$pl['pos']];
                if (!isset($tango['cache'][$t])) $faltan[$t] = true;
            }

            if ($faltan) {
                $disponibles = TANGO_FOTO_MAX_CONSULTAS - $tango['consultas'];
                if ($disponibles <= 0 || (microtime(true) - $tango['inicio']) > TANGO_FOTO_SEGUNDOS) {
                    $tango['mensaje'] ??= 'Se llegó al límite de consultas a Tango para esta foto: algunos renglones quedaron sin opciones de Tango.';
                    break;
                }
                $textos = array_slice(array_keys($faltan), 0, $disponibles);
                $tango['consultas'] += count($textos);

                $respuestas = buscarArticulosTangoEnParalelo($tango['api'], $textos, TANGO_FOTO_ARTICULOS);
                $pdo = pdoVivo($pdo); // la espera por Tango pudo cerrar la conexión
                foreach ($respuestas as $t => $r) {
                    if ($r instanceof TangoApiException) {
                        // Tango contestó pero la respuesta es enorme y llegó cortada o no llegó a tiempo: se achica la consulta.
                        if (!preg_match('/timed out.*?\b[1-9]\d* out of|respuesta ilegible/', $r->getMessage())) throw $r;
                        $tango['cache'][$t] = 'GRANDE';
                    } else {
                        $tango['cache'][$t] = completarArticulosConLaApp($pdo, $r, $mapaFamilias);
                    }
                }
            }

            $siguen = false;
            foreach ($plan as &$pl) {
                if ($pl['articulos'] !== null || $pl['pos'] >= count($pl['candidatas'])) continue;
                $r = $tango['cache'][$pl['candidatas'][$pl['pos']]] ?? null;
                if ($r === null) continue; // no se llegó a consultar
                if ($r !== 'GRANDE') $tango['usado'] = true;
                if (is_array($r) && $r) { $pl['articulos'] = $r; continue; }
                $pl['pos'] = $r === 'GRANDE' ? max($pl['pos'] + 1, $pl['angosta']) : $pl['pos'] + 1;
                $siguen = true;
            }
            unset($pl);
            if (!$siguen) break;
        }
    } catch (Throwable $e) {
        $tango['disponible'] = false;
        $tango['mensaje'] = 'Tango no respondió: ' . mb_substr($e->getMessage(), 0, 140);
        error_log('foto→tango: ' . $e->getMessage());
        return [];
    }

    $salida = [];
    foreach ($plan as $i => $pl) {
        if (!$pl['articulos']) continue;
        $ya = $pendientes[$i]['yaOfrecidos'];
        $filas = array_values(array_filter($pl['articulos'], function ($f) use ($ya) {
            foreach (codigosAppDeArticulo($f['codigo']) as $c) if (isset($ya[$c])) return false;
            return true;
        }));
        $mejores = busqMejores($pendientes[$i]['item'], $filas, 4);
        foreach ($mejores as &$m) $m['origen'] = 'tango';
        unset($m);
        if ($mejores) $salida[$i] = $mejores;
    }
    return $salida;
}

/** Lo que el navegador necesita de una opción: lo del producto, sin datos internos. */
function opcionParaPantalla(array $o): array
{
    unset($o['_indice']);
    $o = castProducto($o);
    $o['puntaje'] = round((float) ($o['puntaje'] ?? 0), 2);
    return $o;
}

function rutaProductosInterpretarImagen(): void
{
    // Cada lectura le cuesta plata a la cuenta de OpenAI: sólo gente conocida,
    // y sólo imágenes de verdad.
    requireAuth();
    // 30 por hora y por origen alcanzan para trabajar y frenan el abuso.
    limitar('imagen:' . ipCliente(), 30, 3600, 'interpretar-imagen');

    if (!isset($_FILES['imagen'])) jsonError('No se recibió imagen', 400);

    $archivo = $_FILES['imagen'];
    if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        jsonError('La imagen no se subió completa, probá de nuevo', 400);
    }
    if (!is_uploaded_file($archivo['tmp_name'])) {
        jsonError('Archivo inválido', 400);
    }
    if ($archivo['size'] > IMAGEN_MAX_BYTES) {
        jsonError('La foto es muy pesada: el máximo son 8 MB', 413);
    }

    // El tipo lo decide el contenido del archivo, no lo que diga el navegador.
    $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
    if (!in_array($mimeType, IMAGEN_TIPOS, true)) {
        jsonError('Eso no es una foto. Se aceptan JPG, PNG, WEBP y HEIC.', 415);
    }

    @set_time_limit(180);
    try {
        $renglones = leerPedidoDeImagen(base64_encode(file_get_contents($archivo['tmp_name'])), $mimeType);
    } catch (Throwable $e) {
        error_log('lectura de foto: ' . $e->getMessage());
        jsonError('No se pudo leer la foto: ' . mb_substr($e->getMessage(), 0, 200), 502);
    }

    // La lectura con la IA tardó: MySQL pudo haber cerrado la conexión de antes.
    jsonSalida(resolverRenglones(obtenerPDO(true), $renglones));
}

/** Busca cada renglón leído. Separado de la lectura para poder probarlo sin la IA. */
function resolverRenglones(PDO $pdo, array $renglones): array
{
    require_once __DIR__ . '/../lib/busqueda_productos.php';

    $catalogo = busqCargarCatalogo($pdo);
    $tango = ['api' => null, 'disponible' => true, 'consultas' => 0, 'usado' => false, 'mensaje' => null, 'cache' => [], 'inicio' => microtime(true)];

    // 1) Lo que tiene la app.
    $opcionesPorRenglon = [];
    $pendientes = [];
    foreach ($renglones as $i => $r) {
        $opciones = busqMejores($r, $catalogo, 4);
        foreach ($opciones as &$o) $o['origen'] = 'app';
        unset($o);
        $opcionesPorRenglon[$i] = $opciones;

        // Si lo de la app no resuelve el renglón, se mira en Tango.
        if (!array_filter($opciones, 'busqEsBuena')) {
            $yaOfrecidos = [];
            foreach ($opciones as $o) $yaOfrecidos[$o['codigo'] ?? ''] = true;
            $pendientes[$i] = ['item' => $r, 'yaOfrecidos' => $yaOfrecidos];
        }
    }

    // 2) Lo pendiente, a Tango de una sola vez.
    $deTango = opcionesDeTangoEnLote($pdo, $pendientes, $tango);

    $pdo = pdoVivo($pdo);

    // 2b) Las opciones que vienen de Tango salen con el precio de la lista, así se ven y se cotizan.
    $tango['precios'] = preciosDeLasOpcionesDeTango($pdo, $tango, $deTango);

    // 3) Se arma la respuesta.
    $items = [];
    foreach ($renglones as $i => $r) {
        $opciones = $opcionesPorRenglon[$i];
        if (!empty($deTango[$i])) {
            foreach ($deTango[$i] as &$o) {
                $o['precioLista'] = $tango['precios'][$o['codigo']] ?? $o['precioLista'] ?? null;
                // Sin precio en la lista de venta casi siempre es un artículo dado de baja: pasa atrás de los que sí tienen.
                if (!$o['precioLista'] && $tango['precios']) $o['puntaje'] = max(0, $o['puntaje'] - 0.08);
            }
            unset($o);
            $opciones = array_merge($opciones, $deTango[$i]);
            // Lo que coincide en medida primero; dentro de eso, lo de mejor puntaje.
            usort($opciones, fn($a, $b) =>
                [(int) !empty($b['medidaCoincide']), $b['puntaje']] <=> [(int) !empty($a['medidaCoincide']), $a['puntaje']]);
            $opciones = array_slice($opciones, 0, 4);
        }

        $ganadora = busqGanadora($opciones);
        $items[] = [
            'detectado' => [
                'producto' => $r['producto'],
                'medida' => $r['medida'],
                'descripcion' => trim($r['producto'] . ' ' . $r['medida']),
                'cantidad' => $r['cantidad'],
                'codigo' => $r['codigo'],
                'original' => $r['original'],
                'dudoso' => $r['dudoso'],
            ],
            'sugerencias' => array_map('opcionParaPantalla', $opciones),
            'matchExacto' => $ganadora ? opcionParaPantalla($ganadora) : null,
        ];
    }

    return [
        'items' => $items,
        'tango' => [
            'consultado' => $tango['usado'],
            'disponible' => $tango['disponible'],
            'mensaje' => $tango['mensaje'],
        ],
    ];
}

/** Precios de lista de todas las opciones de Tango de la foto, en una sola tanda de consultas. */
function preciosDeLasOpcionesDeTango(PDO $pdo, array &$tango, array $deTango): array
{
    if (!$deTango || !$tango['disponible'] || $tango['api'] === null) return [];
    require_once __DIR__ . '/../lib/tango_sync.php';

    $codigos = [];
    foreach ($deTango as $opciones) foreach ($opciones as $o) $codigos[] = $o['codigo'];
    try {
        $precios = preciosDeArticulosTango($tango['api'], $codigos, listaDePreciosTango($pdo));
        return $precios;
    } catch (Throwable $e) {
        error_log('foto→precios: ' . $e->getMessage());
        return [];
    }
}

/**
 * POST /productos/guardar-de-tango {"codigos": ["52706050", ...]} — guarda en la
 * base de la app los artículos de Tango que se eligieron (nombre, medida,
 * familia, IVA y precio de la lista) y devuelve cada uno tal como quedó, para
 * agregarlo al pedido con todos sus datos. Los que ya estaban sólo
 * actualizan precio e IVA: lo curado de la app no se pisa.
 */
function rutaProductosGuardarDeTango(): void
{
    $auth = requireAuth();
    if (($auth['rol'] ?? null) === 'Cliente') jsonError('No tenés acceso a esto', 403);
    require_once __DIR__ . '/../lib/tango_sync.php';
    @set_time_limit(90);

    $codigos = array_values(array_unique(array_filter(
        array_map(fn($c) => trim((string) $c), (array) (cuerpoJson()['codigos'] ?? [])),
        fn($c) => $c !== '' && preg_match('/^[A-Za-z0-9._-]{1,30}$/', $c)
    )));
    if (!$codigos) jsonError('Faltan los códigos de Tango', 422);
    if (count($codigos) > 80) jsonError('Demasiados artículos de una vez', 422);

    $pdo = obtenerPDO();
    try {
        $api = TangoApi::desdeConfig($pdo, 30);
        $filtro = 'AXV_ARTICULO.COD_STA11 IN (' . implode(',', array_map(fn($c) => TangoApi::literalSql($c), $codigos)) . ')';
        $articulos = array_map('articuloDesdeTango', $api->filtrar($api->proceso('articulos'), $filtro));
        $precios = preciosDeArticulosTango($api, array_column($articulos, 'codigo'), listaDePreciosTango($pdo));
    } catch (TangoApiException $e) {
        jsonError('No se pudo leer de Tango: ' . $e->getMessage(), 502);
    }

    $extras = [];
    foreach ($precios as $c => $p) $extras[$c] = ['precioLista' => $p];
    guardarArticulosTango($pdo, $articulos, configJson($pdo, 'tangoFamilias'), $extras, false, true);

    // Cada uno, como quedó en la base.
    $salida = [];
    foreach ($articulos as $a) {
        $cands = codigosAppDeArticulo($a['codigo']);
        $stmt = $pdo->prepare('SELECT * FROM productos WHERE codigo IN (' . implode(',', array_fill(0, count($cands), '?')) . ') LIMIT 1');
        $stmt->execute($cands);
        if ($fila = $stmt->fetch()) $salida[$a['codigo']] = castProducto($fila) + ['origen' => 'app'];
    }
    jsonSalida($salida);
}
