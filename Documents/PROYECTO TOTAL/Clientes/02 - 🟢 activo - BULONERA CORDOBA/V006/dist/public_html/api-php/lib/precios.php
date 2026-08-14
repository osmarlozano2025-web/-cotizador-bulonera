<?php
/**
 * Motor de precios.
 *
 * Convención de signo en todo el archivo:
 *     negativo descuenta   (-15 deja el precio en 85%)
 *     positivo aumenta     (+30 lo deja en 130%)
 *
 * El precio de un renglón sale de:
 *
 *     precio de granel
 *       × ajuste de la familia      ← lo carga el vendedor en el pedido
 *       − descuento por pago         ← contado / 30 / 60 días
 *       − descuento del cliente      ← Minorista, Mayorista, etc.
 *     = precio neto
 *
 * Cada familia tiene en Configuraciones un TOPE de entre -50% y +50%. Ese
 * número no se aplica solo: es el máximo que se puede cargar en el pedido. En
 * el pedido el campo arranca en 0 y se puede mejorar hasta el tope.
 */

require_once __DIR__ . '/db.php';

const CONDICIONES_PAGO = ['contado', '30dias', '60dias'];
const FAMILIAS_CONFIG = ['buloneria', 'tolsen', 'mechas', 'electrodos'];

/** Aplica una lista de porcentajes en cascada, donde un positivo descuenta. */
function encadenarDescuentos(float $base, array $porcentajes): float
{
    $precio = $base;
    foreach ($porcentajes as $pct) {
        $pct = (float) $pct;
        if ($pct <= 0) continue;
        if ($pct >= 100) return 0.0;
        $precio *= (1 - $pct / 100);
    }
    return $precio;
}

/** Ajuste con el signo del pedido: negativo descuenta, positivo aumenta. */
function aplicarAjuste(float $precio, float $ajuste): float
{
    if ($ajuste == 0.0) return $precio;
    $factor = 1 + $ajuste / 100;
    return $factor <= 0 ? 0.0 : $precio * $factor;
}

/**
 * Recorta un ajuste entre 0 y el tope de la familia.
 *
 * Si el tope es -30, se admite de -30 a 0. Si es +20, de 0 a +20. Nunca se
 * puede ir más allá del tope ni para el otro lado.
 */
function ajusteDentroDelTope($ajuste, float $tope): float
{
    $v = (float) $ajuste;
    $min = min(0.0, $tope);
    $max = max(0.0, $tope);
    return max($min, min($max, $v));
}

/** Recorta un tope al rango global permitido. */
function topeValido($tope, array $rango): float
{
    return max((float) $rango['min'], min((float) $rango['max'], (float) $tope));
}

/** Lee del panel de Configuraciones las reglas vigentes. */
function configDescuentos(PDO $pdo): array
{
    static $cache = null;
    if ($cache !== null) return $cache;

    $valores = [];
    foreach ($pdo->query('SELECT clave, valor FROM configuraciones WHERE activo = 1') as $row) {
        $valores[$row['clave']] = json_decode($row['valor'], true);
    }

    $rango = [
        'min' => (float) ($valores['rango_descuento']['min'] ?? -50),
        'max' => (float) ($valores['rango_descuento']['max'] ?? 50),
    ];

    $topes = [];
    foreach (FAMILIAS_CONFIG as $fam) {
        $topes[$fam] = topeValido($valores["descuento_$fam"]['limite'] ?? 0, $rango);
    }

    $cache = [
        'rango' => $rango,
        // Tope por familia: lo máximo que se puede cargar en el pedido.
        'topes' => $topes,
        'pago' => [
            'contado' => $valores['descuento_contado'] ?? ['desc_1' => 0, 'desc_2' => 0],
            '30dias'  => $valores['descuento_30dias']  ?? ['desc_1' => 0, 'desc_2' => 0],
            '60dias'  => $valores['descuento_60dias']  ?? ['desc_1' => 0, 'desc_2' => 0],
        ],
    ];
    return $cache;
}

/** Normaliza la condición de pago a una de las válidas. */
function condicionPagoValida(?string $condicion): string
{
    return in_array($condicion, CONDICIONES_PAGO, true) ? $condicion : 'contado';
}

/**
 * Calcula el desglose de un renglón.
 *
 * @param array  $item          producto con precioLista / precioGranel y familia
 * @param array  $cfg           resultado de configDescuentos()
 * @param string $condicionPago contado | 30dias | 60dias
 * @param float  $descCliente   % del tipo de descuento del cliente
 * @param float  $ajusteFamilia lo cargado en el pedido para esa familia
 */
function calcularDesglose(
    array $item,
    array $cfg,
    string $condicionPago,
    float $descCliente = 0,
    float $ajusteFamilia = 0
): array {
    $familia = $item['familia'] ?? 'otros';
    $lista = (float) ($item['precioLista'] ?? 0);
    $granel = (float) ($item['precioGranel'] ?? $item['precio'] ?? 0);

    // Si el producto no trae precio de lista, el de granel es lo único que hay.
    if ($lista <= 0) $lista = $granel;
    if ($granel <= 0) $granel = $lista;

    $tope = $cfg['topes'][$familia] ?? 0.0;
    $ajuste = ajusteDentroDelTope($ajusteFamilia, $tope);

    $descPago = $cfg['pago'][condicionPagoValida($condicionPago)] ?? ['desc_1' => 0, 'desc_2' => 0];
    $p1 = (float) ($descPago['desc_1'] ?? 0);
    $p2 = (float) ($descPago['desc_2'] ?? 0);

    $neto = encadenarDescuentos(
        aplicarAjuste($granel, $ajuste),
        [$p1, $p2, $descCliente]
    );

    return [
        'precioLista' => round($lista, 2),
        'precioBase' => round($granel, 2),
        'topeFamilia' => $tope,
        'descAjusteFamilia' => $ajuste,
        'descPago1' => $p1,
        'descPago2' => $p2,
        'descCliente' => round($descCliente, 2),
        'precioNeto' => round($neto, 2),
    ];
}

/** % de descuento total de un renglón respecto del precio de lista. */
function descuentoEfectivo(array $desglose): float
{
    $lista = $desglose['precioLista'];
    if ($lista <= 0) return 0.0;
    return round((1 - $desglose['precioNeto'] / $lista) * 100, 2);
}
