<?php
/**
 * Encuentra en el catálogo (y, si falta, en Tango) los productos que pide una
 * foto o un listado a mano.
 *
 * Lo escrito a mano casi nunca se parece al nombre del catálogo: "Allen
 * metrico c/F — 4x10" contra "TORNILLO ALLEN CABEZA FRESADA 10.9 · M4 x 10".
 * Por eso no se compara texto contra texto a ciegas. Se separan dos cosas:
 *
 *   - el NOMBRE (palabras, con las abreviaturas de ferretería ya expandidas), y
 *   - la MEDIDA, comparada como números ("1 1/2" y "1.5" son lo mismo).
 *
 * La medida es lo que distingue un renglón de otro dentro del mismo producto,
 * así que manda: una sugerencia con otra medida no se ofrece como opción
 * buena. Esta parte no usa base de datos ni red, y se prueba sola.
 */

/** Cómo se escribe a mano → cómo aparece en el catálogo. Siempre en minúscula y sin tildes. */
const BUSQ_SINONIMOS = [
    'torn' => 'tornillo', 'tornillos' => 'tornillo',
    'hex' => 'hexagonal', 'hexag' => 'hexagonal', 'hexagonales' => 'hexagonal',
    'cab' => 'cabeza', 'pta' => 'punta', 'ptas' => 'punta',
    'bulones' => 'bulon', 'tuercas' => 'tuerca', 'arandelas' => 'arandela',
    'groover' => 'grower', 'grouver' => 'grower', 'growers' => 'grower', 'groover.' => 'grower',
    'metrico' => 'metrica', 'metricos' => 'metrica', 'metricas' => 'metrica',
    'autofrenantes' => 'autofrenante', 'autoperforantes' => 'autoperforante', 'autoperf' => 'autoperforante',
    'mechas' => 'mecha', 'brocas' => 'broca',
    'cilindrico' => 'cilindrica', 'fresado' => 'fresada', 'redondo' => 'redonda',
    'zincado' => 'zincado', 'zinc' => 'zincado',
    'nf' => 'sae', 'unf' => 'sae', 'nc' => 'uss', 'unc' => 'uss',
    'asas' => 'alas',
    'cil' => 'cilindrica', 'fres' => 'fresada', 'cilind' => 'cilindrica',
    'fina' => 'sae', 'fino' => 'sae', 'gruesa' => 'uss', 'gruesas' => 'uss',
];

/** Palabras que no distinguen un producto de otro. */
const BUSQ_RELLENO = [
    'de', 'con', 'para', 'el', 'la', 'los', 'las', 'y', 'en', 'a', 'x', 'c', 'p', 'por', 'mm', 'pulg', 'pulgada', 'pulgadas',
    'rosca', 'metrica', 'cant', 'unidades', 'u', 'un', 'una', 'del', 'al', 'tipo', 'comun', 'cabeza',
];

function busqTexto(string $t): string
{
    $t = mb_strtolower($t, 'UTF-8');
    return strtr($t, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
}

/**
 * Las palabras que identifican a un producto, con las abreviaturas expandidas.
 * "c/F" → fresada, "G5" → grado 5, "hex" → hexagonal. Sin repetidas.
 */
function busqPalabras(string $texto): array
{
    $t = busqTexto($texto);
    $t = preg_replace('#\bc/\s*f\b#', ' fresada ', $t);
    $t = preg_replace('#\bc/\s*c\b#', ' cilindrica ', $t);
    $t = preg_replace('#\bc/\s*h\b#', ' hexagonal ', $t);
    // "G5", "G 5" y "GRADO 5" son lo mismo, y el 5 no se puede perder: no es lo mismo que el 8.
    $t = preg_replace('#\b(?:g|gs|grado)\s*-?\s*(\d)\b#', ' grado$1 ', $t);
    $t = preg_replace('#[^a-z0-9]+#', ' ', $t);

    $palabras = [];
    foreach (preg_split('/\s+/', trim($t), -1, PREG_SPLIT_NO_EMPTY) as $p) {
        if (ctype_digit($p)) {
            // El número suelto sólo sirve como grado (10.9 se pierde, y está bien: lo cubre la medida).
            continue;
        }
        $p = BUSQ_SINONIMOS[$p] ?? $p;
        if (strlen($p) < 2 || in_array($p, BUSQ_RELLENO, true)) continue;
        $palabras[$p] = true;
    }
    return array_keys($palabras);
}

/**
 * Los números de una medida, en orden y como decimales.
 * "5/16 x 1 1/2" → [0.3125, 1.5]   "1/4x20x1 1/2" → [0.25, 20, 1.5]   "6,5 x 19" → [6.5, 19]
 */
function busqNumeros(string $medida): array
{
    $m = busqTexto($medida);
    $m = str_replace(['×', '*'], 'x', $m);
    $m = preg_replace('/(\d),(\d)/', '$1.$2', $m);
    $m = preg_replace('/(\d)\s*[\'"”″]+/', '$1', $m);

    preg_match_all('#(\d+)\s+(\d+)/(\d+)|(\d+)/(\d+)|(\d+(?:\.\d+)?)#', $m, $f, PREG_SET_ORDER);
    $numeros = [];
    foreach ($f as $x) {
        if (($x[1] ?? '') !== '' && ($x[3] ?? '') !== '' && (int) $x[3] > 0) {
            $numeros[] = (int) $x[1] + (int) $x[2] / (int) $x[3];
        } elseif (($x[4] ?? '') !== '' && (int) $x[5] > 0) {
            $num = (int) $x[4];
            $den = (int) $x[5];
            // "11/2" no es once medios: es 1 1/2 sin el espacio (un numerador de dos cifras mayor al denominador).
            if ($num >= 10 && $num > $den && strlen((string) $num) === 2) {
                $numeros[] = (int) $x[4][0] + (int) $x[4][1] / $den;
            } else {
                $numeros[] = $num / $den;
            }
        } elseif (($x[6] ?? '') !== '') {
            $numeros[] = (float) $x[6];
        }
    }
    return $numeros;
}

function busqIguales(float $a, float $b): bool
{
    return abs($a - $b) < 0.002;
}

/**
 * Qué tan bien coincide la medida pedida con la del producto (0 a 1).
 * Igual, número por número: 1. Pedida contenida en orden dentro de la del
 * producto ("1/4x1/2" en "1/4x20x1/2"): 0.85. Algún número en común: lo que
 * corresponda, hasta 0.4. Nada en común: 0.
 */
function busqPuntajeMedida(array $pedida, array $producto): float
{
    if (!$pedida) return 0.0;
    if (!$producto) return 0.0;

    if (count($pedida) === count($producto)) {
        $todo = true;
        foreach ($pedida as $i => $n) if (!busqIguales($n, $producto[$i])) { $todo = false; break; }
        if ($todo) return 1.0;
    }

    // Subsecuencia en orden.
    $j = 0;
    foreach ($producto as $n) {
        if ($j < count($pedida) && busqIguales($pedida[$j], $n)) $j++;
    }
    if ($j === count($pedida)) return 0.85;

    // Aproximada: la medida nominal escrita a mano (6) contra la del catálogo (6,5).
    if (count($pedida) === count($producto)) {
        $aprox = true;
        foreach ($pedida as $i => $n) {
            $dif = $producto[$i] - $n;
            if (!busqIguales($n, $producto[$i]) && !($n >= 4 && floor($n) == $n && busqIguales($dif, 0.5))) { $aprox = false; break; }
        }
        if ($aprox) return 0.78;
    }

    $enComun = 0;
    foreach ($pedida as $n) {
        foreach ($producto as $p) if (busqIguales($n, $p)) { $enComun++; break; }
    }
    return 0.4 * $enComun / count($pedida) * ($enComun === count($pedida) ? 1 : 0.5);
}

/** Una palabra pedida contra las del producto: igual, o una empieza como la otra (hex… hexagonal). */
function busqPalabraEsta(string $pedida, array $deProducto): bool
{
    foreach ($deProducto as $p) {
        if ($p === $pedida) return true;
        if (strlen($pedida) >= 4 && strlen($p) >= 4 && (str_starts_with($p, $pedida) || str_starts_with($pedida, $p))) return true;
    }
    return false;
}

/** Lo que hace falta de un producto para compararlo, calculado una sola vez. */
function busqIndexar(array $producto): array
{
    $medida = (string) ($producto['medida'] ?? '');
    $descripcion = (string) ($producto['descripcion'] ?? '');
    return [
        'palabras' => busqPalabras($descripcion . ' ' . $medida . ' ' . ($producto['subfamilia'] ?? '')),
        // Si el producto no trae medida aparte, la medida va dentro de la descripción.
        'numeros' => busqNumeros($medida !== '' ? $medida : $descripcion),
        'codigo' => busqTexto((string) ($producto['codigo'] ?? '')),
    ];
}

/**
 * Puntúa un producto contra lo pedido.
 *
 * @param array $pedido  ['palabras' => [...], 'numeros' => [...], 'familia' => ?string]
 * @param array $indice  salida de busqIndexar()
 * @return array ['puntaje' => 0..1, 'medidaCoincide' => bool]
 */
function busqPuntuar(array $pedido, array $indice, array $producto): array
{
    $palabras = $pedido['palabras'];
    $coinciden = 0;
    foreach ($palabras as $p) if (busqPalabraEsta($p, $indice['palabras'])) $coinciden++;

    $recall = $palabras ? $coinciden / count($palabras) : 0.0;
    // Entre dos productos igual de buenos, gana el de nombre más corto y exacto.
    $precision = $indice['palabras'] ? min(1.0, $coinciden / count($indice['palabras'])) : 0.0;
    $texto = 0.85 * $recall + 0.15 * $precision;

    $bonoFamilia = !empty($pedido['familia']) && ($producto['familia'] ?? null) === $pedido['familia'] ? 0.04 : 0.0;

    if ($pedido['numeros']) {
        $medida = busqPuntajeMedida($pedido['numeros'], $indice['numeros']);
        return [
            'puntaje' => min(1.0, 0.45 * $texto + 0.55 * $medida + $bonoFamilia),
            'medidaCoincide' => $medida >= 0.75,
            'medidaAproximada' => $medida >= 0.75 && $medida < 0.85 && $medida != 0.85,
            'recall' => round($recall, 2),
        ];
    }
    return ['puntaje' => min(1.0, $texto + $bonoFamilia), 'medidaCoincide' => true, 'medidaAproximada' => false, 'recall' => round($recall, 2)];
}

/**
 * Las mejores opciones para un renglón pedido.
 *
 * @param array $item       ['producto', 'medida', 'codigo', 'familia_probable']
 * @param array $catalogo   filas de la tabla productos (o de Tango), cada una con 'indice' si ya se indexó
 * @return array  hasta $cuantas filas del catálogo con 'puntaje' y 'medidaCoincide', mejor primero
 */
function busqMejores(array $item, array $catalogo, int $cuantas = 4): array
{
    $pedido = [
        'palabras' => busqPalabras((string) ($item['producto'] ?? '')),
        'numeros' => busqNumeros((string) ($item['medida'] ?? '')),
        'familia' => isset($item['familia_probable']) && $item['familia_probable'] !== 'desconocido' ? $item['familia_probable'] : null,
    ];
    $codigo = busqTexto(trim((string) ($item['codigo'] ?? '')));

    // Con código no hay duda: es ese producto.
    if ($codigo !== '' && strlen($codigo) >= 3) {
        $porCodigo = [];
        foreach ($catalogo as $p) {
            $c = $p['_indice']['codigo'] ?? busqTexto((string) ($p['codigo'] ?? ''));
            if ($c !== '' && ($c === $codigo || ltrim($c, '0') === ltrim($codigo, '0') || $c === 'tol' . $codigo)) {
                unset($p['_indice']);
                $porCodigo[] = $p + ['puntaje' => 1.0, 'medidaCoincide' => true];
            }
        }
        if ($porCodigo) return array_slice($porCodigo, 0, $cuantas);
    }

    if (!$pedido['palabras'] && !$pedido['numeros']) return [];

    $conMedida = [];
    $sinMedida = [];
    foreach ($catalogo as $p) {
        $indice = $p['_indice'] ?? busqIndexar($p);
        // Sin ninguna palabra en común no vale la pena ni calcular.
        if ($pedido['palabras']) {
            $alguna = false;
            foreach ($pedido['palabras'] as $w) if (busqPalabraEsta($w, $indice['palabras'])) { $alguna = true; break; }
            if (!$alguna) continue;
        }
        $r = busqPuntuar($pedido, $indice, $p);
        if ($r['puntaje'] < 0.30) continue;
        unset($p['_indice']);
        $fila = $p + $r;
        if ($r['medidaCoincide']) $conMedida[] = $fila; else $sinMedida[] = $fila;
    }

    $porPuntaje = fn($a, $b) => $b['puntaje'] <=> $a['puntaje'];
    usort($conMedida, $porPuntaje);
    usort($sinMedida, $porPuntaje);

    // Primero lo que coincide en medida. Si no alcanza, se completan 2 con otra
    // medida (marcadas), para que se vea que el producto existe pero no en esa medida.
    $salida = array_slice($conMedida, 0, $cuantas);
    if (count($salida) < $cuantas) {
        $salida = array_merge($salida, array_slice($sinMedida, 0, min(2, $cuantas - count($salida))));
    }
    return $salida;
}

/** Cuántas de las opciones son realmente buenas: alcanza el puntaje y la medida. */
function busqEsBuena(array $opcion): bool
{
    return ($opcion['puntaje'] ?? 0) >= 0.62 && !empty($opcion['medidaCoincide']) && ($opcion['recall'] ?? 0) >= 0.75;
}

/**
 * Si hay una opción claramente mejor que las demás se ofrece como la
 * seleccionada de entrada; si no, el usuario elige entre las opciones.
 */
function busqGanadora(array $opciones): ?array
{
    if (!$opciones) return null;
    $primera = $opciones[0];
    if (!busqEsBuena($primera) || $primera['puntaje'] < 0.8) return null;
    $segunda = $opciones[1]['puntaje'] ?? 0;
    return ($primera['puntaje'] - $segunda) >= 0.08 || ($primera['puntaje'] >= 0.97) ? $primera : null;
}

/**
 * El número de la medida que mejor achica una consulta a Tango, tal como se escribió:
 * el más largo ("5/16", "63", "6,5"). Vacío si la medida no trae números.
 */
function busqNumeroDeConsulta(string $medida): string
{
    preg_match_all('#\d+\s*/\s*\d+|\d+(?:[.,]\d+)?#', $medida, $m);
    $mejor = '';
    foreach ($m[0] as $n) {
        $n = preg_replace('/\s+/', '', $n);
        if (strlen($n) > strlen($mejor)) $mejor = $n;
    }
    return $mejor;
}

/**
 * Las palabras con las que se consulta a Tango por un renglón: pocas y de las
 * que de verdad nombran el producto. Tango exige que estén TODAS, así que
 * pedir de más lo deja sin resultados (por eso nunca se manda la medida: se
 * compara después, por números, sobre lo que Tango devuelve).
 */
function busqPalabrasConsulta(array $item): array
{
    $palabras = busqPalabras((string) ($item['producto'] ?? ''));
    $ruido = ['sae', 'uss', 'metrica', 'rosca', 'fina', 'gruesa', 'tipo', 'comun', 'natural'];
    $palabras = array_values(array_filter($palabras, fn($p) => !in_array($p, $ruido, true) && !str_starts_with($p, 'grado')));

    // Los nombres que identifican al producto: con uno o dos de estos alcanza.
    $distintivas = ['grower', 'tirafondo', 'autofrenante', 'autoperforante', 'allen', 'tanque', 'fixer', 'varilla', 'cuchilla',
                    'mecha', 'broca', 'electrodo'];
    $elegidas = [];
    foreach ($distintivas as $c) {
        if (in_array($c, $palabras, true)) $elegidas[] = $c;
        if (count($elegidas) === 2) break;
    }
    // Sin ninguno: el sustantivo general más la palabra más larga que quede.
    if (!$elegidas) {
        foreach (['arandela', 'tuerca', 'bulon', 'tornillo'] as $c) {
            if (in_array($c, $palabras, true)) { $elegidas[] = $c; break; }
        }
        $resto = array_values(array_diff($palabras, $elegidas));
        usort($resto, fn($a, $b) => strlen($b) <=> strlen($a));
        $elegidas = array_merge($elegidas, array_slice($resto, 0, 2 - count($elegidas)));
    }

    // Tango abrevia ("TCA.AUTOFR.SAE", "TORN.ALLEN", "BULON CAB.EXAG"): con el comienzo de la
    // palabra, o con la parte que no cambia, aparece escrita de cualquier forma.
    $raices = ['hexagonal' => 'exag', 'tornillo' => 'torn'];
    return array_map(fn($p) => $raices[$p] ?? (strlen($p) > 6 ? substr($p, 0, 5) : $p), $elegidas);
}
/** Todo el catálogo de la app, ya indexado. Una consulta por pedido. */
function busqCargarCatalogo(PDO $pdo): array
{
    $filas = $pdo->query('SELECT * FROM productos')->fetchAll();
    foreach ($filas as &$f) $f['_indice'] = busqIndexar($f);
    return $filas;
}
