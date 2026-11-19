<?php
require_once __DIR__ . '/db.php';

function obtenerOpenAIKey(): string
{
    $pdo = obtenerPDO();
    $stmt = $pdo->prepare('SELECT valor FROM config WHERE clave = ?');
    $stmt->execute(['openaiApiKey']);
    $fila = $stmt->fetch();
    if ($fila && $fila['valor']) return $fila['valor'];

    $cfg = require __DIR__ . '/../config.php';
    return $cfg['openai_api_key'];
}

/** Modelo de visión. Se puede cambiar sin tocar código con la clave `openaiModelo` de la tabla config. */
function modeloVision(): string
{
    $stmt = obtenerPDO()->prepare('SELECT valor FROM config WHERE clave = ?');
    $stmt->execute(['openaiModelo']);
    $valor = trim((string) $stmt->fetchColumn());
    return $valor !== '' ? $valor : 'gpt-4o';
}

const PROMPT_LECTURA_PEDIDO = <<<TXT
Sos el asistente de "Córdoba Bulones", una bulonería y ferretería industrial argentina.
Te muestro la foto de un pedido de un cliente: puede ser una hoja o cuaderno escrito a mano,
una lista impresa, un mensaje de WhatsApp o una captura. Leelo con mucho cuidado y devolvé TODOS
los renglones que se piden, uno por cada producto en cada medida.

CÓMO SE ARMA UN PEDIDO (casi siempre así):
- Hay TÍTULOS que nombran un producto (ej. "Allen métrico c/F", "Bulón Hex G5 NF", "Arandela grower",
  "Tirafondo", "Tuerca autofrenante"). Debajo del título hay renglones con MEDIDAS y una CANTIDAD
  (ej. "4x10 → 1000", "5/16 x 1 1/2 → 300"). La flecha, un guion o el espacio separan la medida de la cantidad.
- Cada renglón es un producto distinto: el MISMO título con DISTINTA medida son ítems separados.
- Los renglones heredan el título que tienen arriba. Un título nuevo reemplaza al anterior.
- En las arandelas y tuercas la "medida" es un solo número o fracción (ej. "1/4", "3/8", "5/8 NF").
- Los renglones TACHADOS (cruzados con una X o rayados) NO se piden: no los incluyas.
- Los renglones sin cantidad (flecha vacía) incluilos con cantidad null.
- Si una línea trae un código de producto (números/letras tipo "52306019" o "TOL79005"), ponelo en "codigo".
- Ignorá fechas, rayas de encabezado, nombres de cliente, totales y cualquier cosa que no sea un producto.

ABREVIATURAS HABITUALES (expandilas en "producto" cuando estés seguro):
c/F = cabeza fresada · c/C = cabeza cilíndrica · c/tanque = con tanque (tornillo hormigón/tanque) · Hex = hexagonal ·
GS o G5 = grado 5 · G8 = grado 8 · G2 = grado 2 · NF = rosca fina (UNF/SAE) · NC = rosca gruesa (UNC/USS) ·
pta = punta · Allen métrico = tornillo allen de medida en milímetros · Grower/Groover = arandela elástica de seguridad.

IMPORTANTE SOBRE "producto": conservá las palabras que escribió el cliente (grower, tirafondo, autofrenante,
autoperforante, allen, tanque, hex, etc.) y sólo expandí las abreviaturas. NO las reemplaces por sinónimos:
"Arandela grower" va como "Arandela grower", no como "arandela elástica de seguridad".

FORMATO DE SALIDA: solo un JSON con esta forma, sin texto antes ni después:
{"items":[
  {"producto":"nombre completo del producto, con el título expandido, SIN la medida",
   "medida":"la medida tal como se lee, ej. 5/16 x 1 1/2 · 4x10 · 3/8",
   "cantidad": número o null,
   "codigo": "código si lo hay, si no null",
   "familia_probable":"buloneria | tolsen | mechas | electrodos | desconocido",
   "original":"el renglón tal cual lo leíste, incluido el título, ej. 'Allen metrico c/F 4x10 → 1000'",
   "dudoso": true si no estás seguro de haber leído bien el renglón, si no false}
]}

Familias: buloneria = bulones, tornillos, tuercas, arandelas, tirafondos, autoperforantes, varillas roscadas ·
tolsen = herramientas manuales y eléctricas y accesorios · mechas = mechas y brocas · electrodos = electrodos de soldadura.
Si no hay ningún producto legible devolvé {"items":[]}.
TXT;

/**
 * Lee un pedido de una imagen y lo devuelve ya ordenado en renglones:
 * [['producto','medida','cantidad','codigo','familia_probable','original','dudoso'], ...]
 */
function leerPedidoDeImagen(string $imageBase64, string $mimeType): array
{
    $apiKey = obtenerOpenAIKey();
    if ($apiKey === '') throw new Exception('Falta la clave de OpenAI en Integraciones');

    $modelos = array_values(array_unique([modeloVision(), 'gpt-4o', 'gpt-4o-mini']));
    $ultimoError = 'Error de OpenAI';

    foreach ($modelos as $modelo) {
        $payload = [
            'model' => $modelo,
            'max_tokens' => 4096,
            'temperature' => 0,
            'response_format' => ['type' => 'json_object'],
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => PROMPT_LECTURA_PEDIDO],
                    // detail=high: la letra manuscrita de un cuaderno necesita la imagen en alta resolución.
                    ['type' => 'image_url', 'image_url' => ['url' => "data:$mimeType;base64,$imageBase64", 'detail' => 'high']],
                ],
            ]],
        ];

        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Authorization: Bearer $apiKey"],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 90,
        ]);
        $respuesta = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) throw new Exception("Error de conexión con OpenAI: $error");

        $data = json_decode((string) $respuesta, true);
        if (isset($data['error'])) {
            $ultimoError = $data['error']['message'] ?? 'Error de OpenAI';
            // Un modelo que la cuenta no tiene: se prueba con el siguiente. Cualquier otro error corta.
            if (stripos($ultimoError, 'model') !== false) continue;
            throw new Exception($ultimoError);
        }

        $texto = trim($data['choices'][0]['message']['content'] ?? '');
        $texto = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $texto);
        $json = json_decode($texto, true);
        $lista = is_array($json) ? ($json['items'] ?? ($json['productos'] ?? $json)) : [];
        return normalizarRenglonesLeidos(is_array($lista) ? $lista : []);
    }

    throw new Exception($ultimoError);
}

/** Deja cada renglón con los campos esperados y tira lo que no sirve. */
function normalizarRenglonesLeidos(array $lista): array
{
    $familias = ['buloneria', 'tolsen', 'mechas', 'electrodos', 'desconocido'];
    $salida = [];
    foreach ($lista as $r) {
        if (!is_array($r)) continue;
        $producto = trim((string) ($r['producto'] ?? $r['descripcion'] ?? ''));
        $medida = trim((string) ($r['medida'] ?? ''));
        $codigo = trim((string) ($r['codigo'] ?? ''));
        if ($producto === '' && $medida === '' && $codigo === '') continue;

        $cantidad = $r['cantidad'] ?? null;
        $cantidad = is_numeric($cantidad) && (float) $cantidad > 0 ? (float) $cantidad : null;
        $familia = in_array($r['familia_probable'] ?? '', $familias, true) ? $r['familia_probable'] : 'desconocido';

        $salida[] = [
            'producto' => mb_substr($producto, 0, 150),
            'medida' => mb_substr($medida, 0, 60),
            'cantidad' => $cantidad,
            'codigo' => mb_substr($codigo, 0, 40),
            'familia_probable' => $familia,
            'original' => mb_substr(trim((string) ($r['original'] ?? '')), 0, 200),
            'dudoso' => !empty($r['dudoso']),
        ];
    }
    // Una foto razonable no pasa de unos pocos cientos de renglones.
    return array_slice($salida, 0, 300);
}
