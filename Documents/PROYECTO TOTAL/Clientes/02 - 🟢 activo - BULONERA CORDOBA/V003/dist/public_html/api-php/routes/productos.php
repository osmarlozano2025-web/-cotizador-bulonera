<?php
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/openai.php';

function castProducto(array $p): array
{
    foreach (['unidadGranel', 'unidadFraccion', 'precioLista', 'precioGranel'] as $campo) {
        if (isset($p[$campo])) $p[$campo] = (float) $p[$campo];
    }
    if (isset($p['stock'])) $p['stock'] = (int) $p['stock'];
    return $p;
}

function rutaProductosBuscar(): void
{
    $q = trim($_GET['q'] ?? '');
    $familia = $_GET['familia'] ?? '';
    if (mb_strlen($q) < 2) jsonSalida([]);

    $pdo = obtenerPDO();
    $like = "%$q%";
    $sql = 'SELECT * FROM productos WHERE (descripcion LIKE ? OR codigo LIKE ? OR medida LIKE ?)';
    $params = [$like, $like, $like];
    if ($familia !== '') { $sql .= ' AND familia = ?'; $params[] = $familia; }
    $sql .= ' ORDER BY (descripcion LIKE ?) DESC, descripcion LIMIT 30';
    $params[] = "$q%";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonSalida(array_map('castProducto', $stmt->fetchAll()));
}

function rutaProductosFamilias(): void
{
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
    if (!isset($_FILES['imagen'])) jsonError('No se recibió imagen', 400);

    $archivo = $_FILES['imagen'];
    $imageBase64 = base64_encode(file_get_contents($archivo['tmp_name']));
    $mimeType = $archivo['type'];

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
