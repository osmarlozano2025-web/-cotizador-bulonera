<?php
/**
 * Motor de descuentos (V004).
 *
 * Los descuentos se aplican ENCADENADOS, no sumados: 55% + 18% no da 73%,
 * da 63,1% (se descuenta 18% sobre lo que quedó después del 55%).
 *
 * Orden de la cadena:
 *   precio base → dto. familia 1 → dto. familia 2 → dto. pago 1 → dto. pago 2 → dto. cliente
 *
 * OJO con la base: en la tabla `productos`, `precioGranel` ya trae descuentos
 * aplicados y varían por familia (Bulonería 50%, Mechas 70,11%, Tolsen y
 * Electrodos 0%), que no coinciden con lo configurado. Por eso el motor
 * arranca DESACTIVADO: mientras `motor_descuentos.activo` sea false, el precio
 * se calcula como siempre y el desglose sólo documenta lo que pasaría.
 */

require_once __DIR__ . '/db.php';

const CONDICIONES_PAGO = ['contado', '30dias', '60dias'];

/** Aplica una lista de porcentajes en cascada sobre el precio base. */
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

/**
 * Ajuste por familia, con la convención de signo del pedido:
 *     negativo descuenta   (-15 deja el precio en 85%)
 *     positivo aumenta     (+30 lo deja en 130%)
 *
 * Es distinto de encadenarDescuentos(), donde un número positivo descuenta.
 */
function aplicarAjuste(float $precio, float $ajuste): float
{
    if ($ajuste == 0.0) return $precio;
    $factor = 1 + $ajuste / 100;
    return $factor <= 0 ? 0.0 : $precio * $factor;
}

/** Recorta el ajuste al rango permitido y lo devuelve como número. */
function ajusteValido($ajuste, array $rango): float
{
    $v = (float) $ajuste;
    return max((float) $rango['min'], min((float) $rango['max'], $v));
}

/**
 * Lee del panel de Configuraciones las reglas vigentes.
 * Devuelve defaults razonables si la fila no está cargada.
 */
function configDescuentos(PDO $pdo): array
{
    static $cache = null;
    if ($cache !== null) return $cache;

    $valores = [];
    foreach ($pdo->query("SELECT clave, valor FROM configuraciones WHERE activo = 1") as $row) {
        $valores[$row['clave']] = json_decode($row['valor'], true);
    }

    $motor = $valores['motor_descuentos'] ?? [];

    $cache = [
        // Mientras esté en false, los precios no cambian respecto de V003.
        'activo' => (bool) ($motor['activo'] ?? false),
        // 'lista' es la única base sin descuentos ya incorporados.
        'base' => ($motor['base'] ?? 'lista') === 'granel' ? 'granel' : 'lista',
        'familia' => [
            'buloneria'  => $valores['descuento_buloneria']  ?? ['desc_1' => 25, 'desc_2' => 0],
            'tolsen'     => $valores['descuento_tolsen']     ?? ['desc_1' => 55, 'desc_2' => 18],
            'mechas'     => $valores['descuento_mechas']     ?? ['desc_1' => 55, 'desc_2' => 18],
            'electrodos' => $valores['descuento_electrodos'] ?? ['desc_1' => 0,  'desc_2' => 0],
        ],
        'pago' => [
            'contado' => $valores['descuento_contado'] ?? ['desc_1' => 0, 'desc_2' => 0],
            '30dias'  => $valores['descuento_30dias']  ?? ['desc_1' => 5, 'desc_2' => 0],
            '60dias'  => $valores['descuento_60dias']  ?? ['desc_1' => 0, 'desc_2' => 0],
        ],
        // Ajuste por familia: negativo descuenta, positivo aumenta.
        'rango' => [
            'min' => (float) ($valores['rango_descuento']['min'] ?? -50),
            'max' => (float) ($valores['rango_descuento']['max'] ?? 50),
        ],
        'ajuste' => [
            'buloneria'  => (float) ($valores['ajuste_buloneria']['valor']  ?? 0),
            'tolsen'     => (float) ($valores['ajuste_tolsen']['valor']     ?? 0),
            'mechas'     => (float) ($valores['ajuste_mechas']['valor']     ?? 0),
            'electrodos' => (float) ($valores['ajuste_electrodos']['valor'] ?? 0),
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
 * Calcula el desglose completo de un renglón.
 *
 * @param array  $item          Necesita precioLista y/o precioGranel, y familia.
 * @param array  $cfg           Resultado de configDescuentos().
 * @param string $condicionPago contado | 30dias | 60dias
 * @param float  $descCliente   % del tipo de descuento del cliente (Minorista 5, etc.)
 */
function calcularDesglose(
    array $item,
    array $cfg,
    string $condicionPago,
    float $descCliente = 0,
    ?float $ajusteFamilia = null
): array {
    $familia = $item['familia'] ?? 'otros';
    $lista = (float) ($item['precioLista'] ?? 0);
    $granel = (float) ($item['precioGranel'] ?? $item['precio'] ?? 0);

    // Si el producto no trae precio de lista, el de granel es lo único que hay.
    if ($lista <= 0) $lista = $granel;
    if ($granel <= 0) $granel = $lista;

    $descFamilia = $cfg['familia'][$familia] ?? ['desc_1' => 0, 'desc_2' => 0];
    $descPago = $cfg['pago'][condicionPagoValida($condicionPago)] ?? ['desc_1' => 0, 'desc_2' => 0];

    // El ajuste del pedido manda; si no vino, se usa el base de configuración.
    $rango = $cfg['rango'] ?? ['min' => -50, 'max' => 50];
    $ajuste = ajusteValido(
        $ajusteFamilia ?? ($cfg['ajuste'][$familia] ?? 0),
        $rango
    );

    if (!$cfg['activo']) {
        // Comportamiento histórico: precio de granel menos el descuento del
        // cliente. El ajuste por familia sí se aplica, porque es un valor que
        // alguien cargó a mano en este pedido, no una regla automática.
        $neto = aplicarAjuste(encadenarDescuentos($granel, [$descCliente]), $ajuste);
        return [
            'precioLista' => round($lista, 2),
            'precioBase' => round($granel, 2),
            'baseUsada' => 'granel',
            'descFamilia1' => 0.0,
            'descFamilia2' => 0.0,
            'descAjusteFamilia' => $ajuste,
            'descPago1' => 0.0,
            'descPago2' => 0.0,
            'descCliente' => round($descCliente, 2),
            'precioNeto' => round($neto, 2),
            'motorActivo' => false,
        ];
    }

    $base = $cfg['base'] === 'granel' ? $granel : $lista;
    $f1 = (float) ($descFamilia['desc_1'] ?? 0);
    $f2 = (float) ($descFamilia['desc_2'] ?? 0);
    $p1 = (float) ($descPago['desc_1'] ?? 0);
    $p2 = (float) ($descPago['desc_2'] ?? 0);

    // El ajuste del pedido va último: es la palabra final del vendedor.
    $neto = aplicarAjuste(
        encadenarDescuentos($base, [$f1, $f2, $p1, $p2, $descCliente]),
        $ajuste
    );

    return [
        'precioLista' => round($lista, 2),
        'precioBase' => round($base, 2),
        'baseUsada' => $cfg['base'],
        'descFamilia1' => $f1,
        'descFamilia2' => $f2,
        'descAjusteFamilia' => $ajuste,
        'descPago1' => $p1,
        'descPago2' => $p2,
        'descCliente' => round($descCliente, 2),
        'precioNeto' => round($neto, 2),
        'motorActivo' => true,
    ];
}

/** % de descuento total de un renglón respecto del precio de lista. */
function descuentoEfectivo(array $desglose): float
{
    $lista = $desglose['precioLista'];
    if ($lista <= 0) return 0.0;
    return round((1 - $desglose['precioNeto'] / $lista) * 100, 2);
}
