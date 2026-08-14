<?php
/**
 * Tests del motor de precios. No toca la base.
 *
 *   npm run test:precios
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

echo "\n--- ajuste: negativo descuenta, positivo aumenta\n";

verificar('sin ajuste no toca el precio', 1000.0, aplicarAjuste(1000, 0));
verificar('-15 deja el precio en 85%', 850.0, aplicarAjuste(1000, -15));
verificar('+30 lo sube a 130%', 1300.0, aplicarAjuste(1000, 30));
verificar('-50 lo deja a la mitad', 500.0, aplicarAjuste(1000, -50));
verificar('-100 lo deja en cero', 0.0, aplicarAjuste(1000, -100));

verificar('cadena: -50 y despues -20', 400.0, encadenarAjustes(1000, [-50, -20]));
verificar('cadena mixta: -20 y despues +10', 880.0, encadenarAjustes(1000, [-20, 10]));

echo "\n--- el tope de la familia manda\n";

// Tope -30: se admite de -30 a 0, nada más.
verificar('dentro del tope pasa igual',      -20.0, ajusteDentroDelTope(-20, -30));
verificar('justo en el tope pasa',           -30.0, ajusteDentroDelTope(-30, -30));
verificar('pasarse del tope se recorta',     -30.0, ajusteDentroDelTope(-45, -30));
verificar('un aumento con tope negativo no', 0.0,   ajusteDentroDelTope(10, -30));

// Tope +20: se admite de 0 a +20.
verificar('tope positivo admite el aumento',  15.0, ajusteDentroDelTope(15, 20));
verificar('tope positivo recorta el exceso',  20.0, ajusteDentroDelTope(35, 20));
verificar('tope positivo no admite descuento', 0.0, ajusteDentroDelTope(-10, 20));

// Tope 0: no se puede mover nada.
verificar('tope 0 no admite descuento', 0.0, ajusteDentroDelTope(-25, 0));
verificar('tope 0 no admite aumento',   0.0, ajusteDentroDelTope(25, 0));

echo "\n--- topes contra el rango global\n";

$rango = ['min' => -50, 'max' => 50];
verificar('un tope de -80 se recorta a -50', -50.0, topeValido(-80, $rango));
verificar('un tope de +90 se recorta a +50',  50.0, topeValido(90, $rango));
verificar('un tope dentro del rango pasa',   -35.0, topeValido(-35, $rango));

echo "\n--- precio de un renglón\n";

$cfg = [
    'rango' => $rango,
    'topes' => [
        'buloneria'  => -25.0,
        'tolsen'     => -50.0,
        'mechas'     => -50.0,
        'electrodos' => 0.0,
    ],
    'pago' => [
        'contado' => 0.0,
        '30dias'  => -5.0,
        '60dias'  => 8.0,
    ],
];

$item = ['familia' => 'tolsen', 'precioGranel' => 1000];

$d = calcularDesglose($item, $cfg, 'contado', 0, 0);
verificar('sin nada: queda el precio del producto', 1000.0, $d['precioNeto']);
verificar('y guarda el tope de la familia', -50.0, $d['topeFamilia']);

$d = calcularDesglose($item, $cfg, 'contado', 0, -20);
verificar('con -20% de ajuste', 800.0, $d['precioNeto']);

$d = calcularDesglose($item, $cfg, 'contado', 10, -20);
verificar('más 10% de descuento del cliente', 720.0, $d['precioNeto']);

$d = calcularDesglose($item, $cfg, '30dias', 10, -20);
verificar('más 5% de descuento por pago a 30 días', 684.0, $d['precioNeto']);

$d = calcularDesglose($item, $cfg, '60dias', 0, 0);
verificar('60 días AUMENTA un 8%', 1080.0, $d['precioNeto']);

$d = calcularDesglose($item, $cfg, '60dias', 10, -20);
verificar('aumento de pago sobre descuentos', 777.6, $d['precioNeto']);

$d = calcularDesglose($item, $cfg, 'contado', 0, -70);
verificar('un -70% se recorta al tope de -50%', 500.0, $d['precioNeto']);
verificar('y el desglose lo deja asentado', -50.0, $d['descAjusteFamilia']);

$d = calcularDesglose(['familia' => 'electrodos', 'precioGranel' => 500], $cfg, 'contado', 0, -30);
verificar('Electrodos tiene tope 0: no admite descuento', 500.0, $d['precioNeto']);

$d = calcularDesglose(['familia' => 'buloneria', 'precioGranel' => 100], $cfg, 'contado', 0, -25);
verificar('Bulonería en su tope de -25%', 75.0, $d['precioNeto']);

echo "\n--- bordes\n";

$d = calcularDesglose(['familia' => 'tolsen', 'precio' => 500], $cfg, 'contado', 0, 0);
verificar('acepta el campo precio a secas', 500.0, $d['precioNeto']);

$d = calcularDesglose(['familia' => 'inventada', 'precioGranel' => 1000], $cfg, 'contado', 0, -30);
verificar('familia desconocida: tope 0, no descuenta', 1000.0, $d['precioNeto']);

$d = calcularDesglose(['familia' => 'tolsen', 'precioGranel' => 0], $cfg, 'contado', 0, -20);
verificar('precio cero no rompe', 0.0, $d['precioNeto']);
verificar('descuento efectivo de un precio cero es 0', 0.0, descuentoEfectivo($d));

verificar('condición de pago inventada cae en contado', 'contado', condicionPagoValida('90dias'));
verificar('null cae en contado', 'contado', condicionPagoValida(null));

echo "\n";
echo $fallados === 0
    ? "TODO OK — $total verificaciones\n\n"
    : "$fallados de $total verificaciones fallaron\n\n";

exit($fallados === 0 ? 0 : 1);
