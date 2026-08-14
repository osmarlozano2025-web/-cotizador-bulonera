<?php
/**
 * Motor de precios.
 *
 * Convención de signo en todo el archivo:
 *     negativo descuenta   (-15 deja el precio en 85%)
 *     positivo aumenta     (+30 lo deja en 130%)
 *
 * La cadena tiene tres pasos y ninguno está escondido:
 *
 *     precio del producto
 *       → descuento de familia    ← lo carga el vendedor, topeado en Configuraciones
 *       → descuento del cliente   ← Minorista, Mayorista, etc.
 *       → condición de pago       ← puede descontar o aumentar
 *     = precio neto
 *
 * Cada familia tiene en Configuraciones un TOPE de entre -50% y +50%. Ese
 * número no se aplica solo: es el máximo que se puede cargar en el pedido. En
 * el pedido el campo arranca en 0 y se puede mejorar hasta el tope.
 */

require_once __DIR__ . '/db.php';

const CONDICIONES_PAGO = ['contado', '30dias', '60dias'];
const FAMILIAS_CONFIG = ['buloneria', 'tolsen', 'mechas', 'electrodos'];

/** Aplica un porcentaje con signo: negativo descuenta, positivo aumenta. */
function aplicarAjuste(float $precio, float $ajuste): float
{
    if ($ajuste == 0.0) return $precio;
    $factor = 1 + $ajuste / 100;
    return $factor <= 0 ? 0.0 : $precio * $factor;
}

/** Varios porcentajes con signo, uno detrás del otro. */
function encadenarAjustes(float $base, array $ajustes): float
{
    $precio = $base;
    foreach ($ajustes as $a) {
        $precio = aplicarAjuste($precio, (float) $a);
    }
    return $precio;
}

/**
 * Recorta un ajuste entre 0 y el tope de la familia.
 *
 * Si el tope es -30, se admite de -30 a 0. Si es +20, de 0 a +20. Si es 0, nada.
 */
function ajusteDentroDelTope($ajuste, float $tope): float
{
    $v = (float) $ajuste;
    return max(min(0.0, $tope), min(max(0.0, $tope), $v));
}

/** Recorta un valor al rango global permitido. */
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

    $pago = [];
    foreach (CONDICIONES_PAGO as $c) {
        $pago[$c] = topeValido($valores["descuento_$c"]['valor'] ?? 0, $rango);
    }

    $cache = [
        'rango' => $rango,
        // Tope por familia: lo máximo que se puede cargar en el pedido.
        'topes' => $topes,
        // Condición de pago: un solo valor con signo.
        'pago' => $pago,
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
 * @param array  $item          producto con precioGranel (o precio) y familia
 * @param array  $cfg           resultado de configDescuentos()
 * @param string $condicionPago contado | 30dias | 60dias
 * @param float  $descCliente   % del tipo de descuento del cliente (positivo descuenta)
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
    $precio = (float) ($item['precioGranel'] ?? $item['precio'] ?? $item['precioLista'] ?? 0);

    $tope = $cfg['topes'][$familia] ?? 0.0;
    $ajuste = ajusteDentroDelTope($ajusteFamilia, $tope);

    $pago = (float) ($cfg['pago'][condicionPagoValida($condicionPago)] ?? 0);

    // El descuento del cliente viene como positivo y descuenta, así que se
    // invierte para entrar en la cadena con la convención de signo del resto.
    $neto = encadenarAjustes($precio, [$ajuste, -abs($descCliente), $pago]);

    return [
        'precioLista' => round($precio, 2),
        'precioBase' => round($precio, 2),
        'topeFamilia' => $tope,
        'descAjusteFamilia' => $ajuste,
        'descPago1' => $pago,
        'descPago2' => 0.0,
        'descCliente' => round($descCliente, 2),
        'precioNeto' => round($neto, 2),
    ];
}

/** % de descuento total de un renglón respecto del precio del producto. */
function descuentoEfectivo(array $desglose): float
{
    $base = $desglose['precioBase'];
    if ($base <= 0) return 0.0;
    return round((1 - $desglose['precioNeto'] / $base) * 100, 2);
}
