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
    if (mb_strlen($q) < 2) jsonSalida([]);

    $pdo = obtenerPDO();
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

// Compara texto detectado contra el catálogo usando similar_text() (nativo de PHP) como sustituto de Fuse.js
function mejoresCoincidencias(PDO $pdo, string $descripcionBuscada, int $cantidad = 3): array
{
    $palabras = preg_split('/\s+/', mb_strtolower(preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $descripcionBuscada)));
    $palabras = array_filter($palabras, fn($p) => mb_strlen($p) >= 3);
    if (empty($palabras)) return [];

    // Traemos candidatos que compartan al menos una palabra significativa
    $condiciones = [];
    $params = [];
    foreach (array_slice($palabras, 0, 4) as $p) {
        $condiciones[] = 'descripcion LIKE ?';
        $params[] = "%$p%";
    }
    $sql = 'SELECT * FROM productos WHERE (' . implode(' OR ', $condiciones) . ') LIMIT 300';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $candidatos = $stmt->fetchAll();

    $puntuados = [];
    foreach ($candidatos as $c) {
        $texto = $c['descripcion'] . ' ' . ($c['medida'] ?? '');
        similar_text(mb_strtolower($descripcionBuscada), mb_strtolower($texto), $pct);
        $puntuados[] = ['item' => castProducto($c), 'score' => $pct];
    }
    usort($puntuados, fn($a, $b) => $b['score'] <=> $a['score']);
    return array_slice($puntuados, 0, $cantidad);
}

function rutaProductosInterpretarImagen(): void
{
    // Cada lectura le cuesta plata a la cuenta de OpenAI: sólo gente conocida,
    // y sólo imágenes de verdad.
    requireAuth();

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

    $imageBase64 = base64_encode(file_get_contents($archivo['tmp_name']));

    $productosDetectados = interpretarImagenOpenAI($imageBase64, $mimeType);

    $pdo = obtenerPDO();
    $resultado = [];
    foreach ($productosDetectados as $pd) {
        $matches = mejoresCoincidencias($pdo, $pd['descripcion'] ?? '');
        $mejores = array_map(fn($m) => $m['item'], $matches);
        $matchExacto = (!empty($matches) && $matches[0]['score'] > 70) ? $matches[0]['item'] : null;

        $resultado[] = [
            'detectado' => $pd,
            'sugerencias' => $mejores,
            'matchExacto' => $matchExacto,
        ];
    }
    jsonSalida($resultado);
}
