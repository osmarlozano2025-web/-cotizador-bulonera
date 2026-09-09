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

function interpretarImagenOpenAI(string $imageBase64, string $mimeType): array
{
    $apiKey = obtenerOpenAIKey();

    $prompt = <<<TXT
Sos un asistente de una ferretería industrial argentina llamada "Córdoba Bulones".
Interpretá este pedido (puede ser manuscrito o una foto) y devolvé un JSON con la lista de productos.

Formato (solo JSON, sin explicación ni markdown):
[{ "descripcion": "...", "cantidad": 1, "unidad": "granel", "familia_probable": "buloneria" }]

Valores posibles de familia_probable: buloneria, tolsen, mechas, electrodos, desconocido
- buloneria: bulones, tornillos, tuercas, arandelas, varillas roscadas
- tolsen: herramientas de mano, eléctricas y accesorios (incluye pinzas porta electrodo)
- mechas: mechas y brocas
- electrodos: electrodos de soldadura (E6013, E7018, E6010, inoxidables, etc.)
Si no hay productos claros, devolvé: []
TXT;

    $payload = [
        'model' => 'gpt-4o-mini',
        'max_tokens' => 4096,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'text', 'text' => $prompt],
                ['type' => 'image_url', 'image_url' => ['url' => "data:$mimeType;base64,$imageBase64"]],
            ],
        ]],
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer $apiKey",
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 60,
    ]);
    $respuesta = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) throw new Exception("Error de conexión con OpenAI: $error");

    $data = json_decode($respuesta, true);
    if (isset($data['error'])) throw new Exception($data['error']['message'] ?? 'Error de OpenAI');

    $texto = trim($data['choices'][0]['message']['content'] ?? '[]');
    $texto = preg_replace('/```json\s*|```\s*/', '', $texto);

    $productos = json_decode($texto, true);
    return is_array($productos) ? $productos : [];
}
