<?php
/**
 * Pruebas del buscador de productos para pedidos por foto (sin base ni red).
 *
 *   npm run test:busqueda        (desde app/)
 */
require_once __DIR__ . '/../lib/busqueda_productos.php';

$fallos = 0;
function verificar(string $nombre, bool $ok): void
{
    global $fallos;
    echo ($ok ? '  ok   ' : '  FALLA ') . $nombre . "\n";
    if (!$ok) $fallos++;
}
function p(string $codigo, string $descripcion, string $medida, string $familia = 'buloneria'): array
{
    return ['codigo' => $codigo, 'descripcion' => $descripcion, 'medida' => $medida, 'familia' => $familia];
}
function mejor(array $item, array $catalogo): ?array
{
    return busqMejores($item, $catalogo, 4)[0] ?? null;
}

echo "Medidas\n";
verificar('1 1/2 = 1.5', busqNumeros('1 1/2') === [1.5]);
verificar('5/16 x 1 1/2', busqNumeros('5/16 x 1 1/2') === [0.3125, 1.5]);
verificar('coma decimal 6,5 x 19', busqNumeros('6,5 x 19') === [6.5, 19.0]);
verificar('rosca en el medio 1/4x20x1 1/2', busqNumeros('1/4x20x1 1/2') === [0.25, 20.0, 1.5]);
verificar('Tango sin espacio: 11/2 es 1 1/2', busqNumeros('5/16x18x11/2')[2] === 1.5);
verificar('Tango sin espacio: 21/4 es 2 1/4', busqNumeros('5/16x18x21/4')[2] === 2.25);
verificar('3/16 no se confunde con mixta', busqNumeros('3/16') === [0.1875]);
verificar('pulgada con comillas 1"', busqNumeros('1"') === [1.0]);
verificar('igual: 1.0', busqPuntajeMedida([4, 10], [4, 10]) === 1.0);
verificar('contenida en orden: 4x10 en 4x0,70x10', busqPuntajeMedida([4, 10], [4, 0.7, 10]) === 0.85);
verificar('distinta: 4x10 vs 4x12 no es buena', busqPuntajeMedida([4, 10], [4, 12]) < 0.5);
verificar('nominal: 6x50 contra 6,5 x 50 es aproximada', busqPuntajeMedida([6, 50], [6.5, 50]) === 0.78);
verificar('pulgadas: 1 contra 1,5 NO es aproximada', busqPuntajeMedida([1], [1.5]) < 0.5);

echo "Nombres\n";
$palabras = busqPalabras('Allen metrico c/F');
verificar('c/F es fresada', in_array('fresada', $palabras, true));
verificar('G5 es grado5 (no se pierde el número)', in_array('grado5', busqPalabras('Bulón Hex G5 NF'), true));
verificar('NF es sae', in_array('sae', busqPalabras('tuerca 5/8 NF'), true));
verificar('hex es hexagonal', in_array('hexagonal', busqPalabras('bulon hex'), true));
verificar('C/CIL de Tango es cilindrica', in_array('cilindrica', busqPalabras('TORN.ALLEN C/CIL.C.12,9'), true));
verificar('consulta a Tango por grower: una palabra', busqPalabrasConsulta(['producto' => 'Arandela grower']) === ['grower']);
verificar('consulta a Tango por autofrenante: raíz', busqPalabrasConsulta(['producto' => 'Tuerca autofrenante']) === ['autof']);
verificar('consulta a Tango por bulón hexagonal: exag', busqPalabrasConsulta(['producto' => 'Bulón hexagonal grado 5']) === ['bulon', 'exag']);
verificar('número para achicar: el más largo', busqNumeroDeConsulta('5/16 x 1 1/2') === '5/16' && busqNumeroDeConsulta('6x63') === '63');

echo "Elegir el producto\n";
$catalogo = [
    p('1', 'TORNILLO ALLEN CABEZA FRESADA 10.9', '4x0,70x10'),
    p('2', 'TORNILLO ALLEN CABEZA FRESADA 10.9', '4x0,70x8'),
    p('3', 'TORNILLO ALLEN CABEZA CILINDRICA 12.9', '4x0,70x10'),
    p('4', 'TORN.HO.C/TANQUE', '3/16 x 1/2'),
    p('5', 'TORN.HO.C/TANQUE', '3/16 x 5/8'),
    p('6', 'BULON CABEZA HEXAGONAL GRADO 5 SAE DORADO', '3/8 x 1 1/2'),
    p('7', 'BULON CABEZA HEXAGONAL GRADO 8 SAE DORADO', '3/8 x 1 1/2'),
    p('8', 'ARANDELAS GROWER GRANEL', '1/4'),
    p('9', 'ARANDELAS GROWER GRANEL', '3/8'),
];
$r = mejor(['producto' => 'Allen metrico c/F', 'medida' => '4x10', 'codigo' => '', 'familia_probable' => 'buloneria'], $catalogo);
verificar('Allen c/F 4x10 → fresada de 4x10 (código 1)', $r && $r['codigo'] === '1' && busqEsBuena($r));
$r = mejor(['producto' => 'Allen metrico cabeza cilindrica', 'medida' => '4x10', 'codigo' => '', 'familia_probable' => 'buloneria'], $catalogo);
verificar('Allen cilíndrica 4x10 → cilíndrica (código 3)', $r && $r['codigo'] === '3');
$r = mejor(['producto' => 'Tornillo con tanque', 'medida' => '3/16 x 1/2', 'codigo' => '', 'familia_probable' => 'buloneria'], $catalogo);
verificar('tornillo con tanque 3/16 x 1/2 → código 4, y es ganadora', $r && $r['codigo'] === '4' && busqGanadora([$r]) !== null);
$r = mejor(['producto' => 'Bulón Hex G5 rosca fina', 'medida' => '3/8 x 1 1/2', 'codigo' => '', 'familia_probable' => 'buloneria'], $catalogo);
verificar('bulón G5 → grado 5 y no grado 8 (código 6)', $r && $r['codigo'] === '6');
$r = mejor(['producto' => 'Arandela grower', 'medida' => '3/8', 'codigo' => '', 'familia_probable' => 'buloneria'], $catalogo);
verificar('arandela grower 3/8 → código 9', $r && $r['codigo'] === '9');
$r = mejor(['producto' => 'Arandela grower', 'medida' => '5/8', 'codigo' => '', 'familia_probable' => 'buloneria'], $catalogo);
verificar('si la medida no existe, la opción queda marcada como otra medida', $r === null || empty($r['medidaCoincide']));
verificar('y no es una opción "buena"', $r === null || !busqEsBuena($r));
$r = mejor(['producto' => '', 'medida' => '', 'codigo' => '000007', 'familia_probable' => 'desconocido'], $catalogo);
verificar('por código (con ceros de adelante) → código 7', $r && $r['codigo'] === '7' && $r['puntaje'] === 1.0);
verificar('algo que no está en el catálogo no inventa resultados', busqMejores(['producto' => 'Pala mecanica', 'medida' => '', 'codigo' => '', 'familia_probable' => 'desconocido'], $catalogo) === []);

echo $fallos ? "\n$fallos prueba(s) fallaron\n" : "\nTodo bien\n";
exit($fallos ? 1 : 0);
