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

/**
 * Las condiciones de pago que existen desde la primera versión. Se guardan con
 * la clave 'descuento_*'; las que carga el usuario van con 'pago_*'.
 */
const PAGOS_DE_FABRICA = ['contado' => 'Contado', '30dias' => '30 días', '60dias' => '60 días'];

/** Con las que arranca una base que todavía no tiene la lista cargada. */
const FAMILIAS_POR_DEFECTO = [
    ['clave' => 'buloneria',       'nombre' => 'Bulonería',      'orden' => 1],
    ['clave' => 'tolsen',          'nombre' => 'Tolsen',         'orden' => 2],
    ['clave' => 'mechas',          'nombre' => 'Mechas',         'orden' => 3],
    ['clave' => 'electrodos',      'nombre' => 'Electrodos',     'orden' => 4],
    ['clave' => 'escaleras',       'nombre' => 'Escaleras',      'orden' => 5],
    ['clave' => 'cintas_metricas', 'nombre' => 'Cintas Métricas','orden' => 6],
];

/**
 * Las familias de producto, en el orden en que se muestran.
 *
 * Salen de la configuración y no de una lista escrita en el código: antes la
 * misma lista estaba repetida en seis archivos, y agregar una familia sin tocar
 * los seis la dejaba a medias — visible en pantalla pero sin descuento ni
 * depósito. Devuelve clave => ['clave', 'nombre', 'orden'].
 */
function familiasConfiguradas(PDO $pdo): array
{
    static $cache = null;
    if ($cache !== null) return $cache;

    $fila = $pdo->query("SELECT valor FROM configuraciones WHERE clave = 'familias' AND activo = 1")->fetch();
    $lista = $fila ? json_decode($fila['valor'], true) : null;
    if (!is_array($lista) || !$lista) $lista = FAMILIAS_POR_DEFECTO;

    $familias = [];
    foreach ($lista as $f) {
        $clave = $f['clave'] ?? null;
        if (!$clave) continue;
        $familias[$clave] = [
            'clave' => $clave,
            'nombre' => $f['nombre'] ?? $clave,
            'orden' => (int) ($f['orden'] ?? 99),
        ];
    }
    uasort($familias, fn($a, $b) => $a['orden'] <=> $b['orden']);

    return $cache = $familias;
}

/** Sólo las claves, que es lo que se compara contra el campo del producto. */
function clavesDeFamilia(PDO $pdo): array
{
    return array_keys(familiasConfiguradas($pdo));
}

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
    foreach (clavesDeFamilia($pdo) as $fam) {
        $topes[$fam] = topeValido($valores["descuento_$fam"]['limite'] ?? 0, $rango);
    }

    // Las tres de fábrica más las que haya cargado el usuario. Cada una lleva
    // el nombre con el que se escribió, que es el que se muestra.
    $pago = [];
    $etiquetasPago = [];
    foreach (PAGOS_DE_FABRICA as $clave => $nombre) {
        $pago[$clave] = topeValido($valores["descuento_$clave"]['valor'] ?? 0, $rango);
        $etiquetasPago[$clave] = $nombre;
    }
    foreach ($valores as $clave => $v) {
        if (strpos($clave, 'pago_') !== 0) continue;
        $nombre = substr($clave, strlen('pago_'));
        $pago[$nombre] = topeValido($v['valor'] ?? 0, $rango);
        $etiquetasPago[$nombre] = $v['nombre'] ?? $nombre;
    }

    return $cache = [
        'rango' => $rango,
        // Tope por familia: lo máximo que se puede cargar en el pedido.
        'topes' => $topes,
        // Condición de pago: un solo valor con signo.
        'pago' => $pago,
        'etiquetasPago' => $etiquetasPago,
    ];
}

/**
 * Normaliza la condición de pago contra las que existen de verdad.
 *
 * Antes la lista estaba escrita en el código y sólo tenía las tres originales:
 * una condición nueva se convertía en "contado" sin avisar, y cobraba el
 * descuento equivocado.
 */
function condicionPagoValida(array $cfg, ?string $condicion): string
{
    return ($condicion !== null && isset($cfg['pago'][$condicion])) ? $condicion : 'contado';
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

    $pago = (float) ($cfg['pago'][condicionPagoValida($cfg, $condicionPago)] ?? 0);

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
