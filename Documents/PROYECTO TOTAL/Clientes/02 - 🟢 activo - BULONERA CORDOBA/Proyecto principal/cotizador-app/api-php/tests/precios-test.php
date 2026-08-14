<?php
/**
 * Tests del motor de descuentos. No toca la base.
 *
 *   php api-php/tests/precios-test.php
 */

require_once __DIR__ . '/../lib/precios.php';

$total = 0;
$fallados = 0;

function verificar(string $caso, $esperado, $obtenido): void
{
    global $total, $fallados;
    $total++;

    $ok = is_float($esperado) || is_float($obtenido)
        ? abs((float) $esperado - (float) $obtenido) < 0.011
        : $esperado === $obtenido;

    if ($ok) {
        echo "  ok    $caso\n";
    } else {
        $fallados++;
        echo "  FALLA $caso\n";
        echo "        esperado: " . var_export($esperado, true) . "\n";
        echo "        obtenido: " . var_export($obtenido, true) . "\n";
    }
}

echo "\n--- encadenarDescuentos\n";

verificar('sin descuentos deja el precio igual',
    1000.0, encadenarDescuentos(1000, []));

verificar('un 25% simple',
    750.0, encadenarDescuentos(1000, [25]));

// El caso central del requisito 4: 55% + 18% NO es 73%.
verificar('55% + 18% encadenado da 369, no 270',
    369.0, encadenarDescuentos(1000, [55, 18]));

verificar('el orden no altera el resultado',
    encadenarDescuentos(1000, [18, 55]), encadenarDescuentos(1000, [55, 18]));

verificar('los porcentajes en cero se ignoran',
    450.0, encadenarDescuentos(1000, [55, 0, 0]));

verificar('un 100% deja el precio en cero',
    0.0, encadenarDescuentos(1000, [100]));

verificar('los negativos se ignoran, no suben el precio',
    1000.0, encadenarDescuentos(1000, [-10]));

verificar('cadena de cuatro tramos',
    // 1000 → 450 → 369 → 350.55 → 333.02
    333.02, encadenarDescuentos(1000, [55, 18, 5, 5]));

echo "\n--- condicionPagoValida\n";

verificar('acepta contado', 'contado', condicionPagoValida('contado'));
verificar('acepta 30dias', '30dias', condicionPagoValida('30dias'));
verificar('null cae en contado', 'contado', condicionPagoValida(null));
verificar('un valor inventado cae en contado', 'contado', condicionPagoValida('90dias'));

echo "\n--- calcularDesglose con el motor APAGADO\n";

$cfgApagado = [
    'activo' => false,
    'base' => 'lista',
    'familia' => ['tolsen' => ['desc_1' => 55, 'desc_2' => 18]],
    'pago' => ['contado' => ['desc_1' => 0, 'desc_2' => 0]],
];

$item = ['familia' => 'tolsen', 'precioLista' => 1000, 'precioGranel' => 800];
$d = calcularDesglose($item, $cfgApagado, 'contado', 10);

verificar('usa precioGranel como base', 800.0, $d['precioBase']);
verificar('aplica sólo el descuento del cliente', 720.0, $d['precioNeto']);
verificar('no aplica descuentos de familia', 0.0, $d['descFamilia1']);
verificar('avisa que el motor está apagado', false, $d['motorActivo']);

echo "\n--- calcularDesglose con el motor ENCENDIDO\n";

$cfg = [
    'activo' => true,
    'base' => 'lista',
    'familia' => [
        'buloneria' => ['desc_1' => 25, 'desc_2' => 0],
        'tolsen' => ['desc_1' => 55, 'desc_2' => 18],
        'electrodos' => ['desc_1' => 0, 'desc_2' => 0],
    ],
    'pago' => [
        'contado' => ['desc_1' => 0, 'desc_2' => 0],
        '30dias' => ['desc_1' => 5, 'desc_2' => 0],
    ],
];

$d = calcularDesglose(['familia' => 'tolsen', 'precioLista' => 1000, 'precioGranel' => 1000], $cfg, 'contado', 0);
verificar('Tolsen contado sin cliente: 369', 369.0, $d['precioNeto']);
verificar('usa precioLista como base', 1000.0, $d['precioBase']);
verificar('descuento efectivo 63,1%', 63.1, descuentoEfectivo($d));

$d = calcularDesglose(['familia' => 'buloneria', 'precioLista' => 1000, 'precioGranel' => 500], $cfg, 'contado', 0);
verificar('Bulonería 25% sobre lista, ignora el granel', 750.0, $d['precioNeto']);

$d = calcularDesglose(['familia' => 'electrodos', 'precioLista' => 1000, 'precioGranel' => 1000], $cfg, 'contado', 0);
verificar('Electrodos es precio neto, sin descuento', 1000.0, $d['precioNeto']);

$d = calcularDesglose(['familia' => 'tolsen', 'precioLista' => 1000, 'precioGranel' => 1000], $cfg, '30dias', 0);
verificar('Tolsen a 30 días suma otro 5% encadenado', 350.55, $d['precioNeto']);

$d = calcularDesglose(['familia' => 'tolsen', 'precioLista' => 1000, 'precioGranel' => 1000], $cfg, '30dias', 10);
verificar('más 10% de cliente Mayorista', 315.5, $d['precioNeto']);

echo "\n--- bordes\n";

$d = calcularDesglose(['familia' => 'tolsen', 'precioGranel' => 500], $cfg, 'contado', 0);
verificar('sin precioLista usa el de granel como lista', 500.0, $d['precioLista']);

$d = calcularDesglose(['familia' => 'inventada', 'precioLista' => 1000], $cfg, 'contado', 0);
verificar('familia desconocida no descuenta nada', 1000.0, $d['precioNeto']);

$d = calcularDesglose(['familia' => 'tolsen', 'precioLista' => 0, 'precioGranel' => 0], $cfg, 'contado', 0);
verificar('precio cero no rompe', 0.0, $d['precioNeto']);
verificar('descuento efectivo de un precio cero es 0', 0.0, descuentoEfectivo($d));

echo "\n";
echo $fallados === 0
    ? "TODO OK — $total verificaciones\n\n"
    : "$fallados de $total verificaciones fallaron\n\n";

exit($fallados === 0 ? 0 : 1);
