<?php
/**
 * Excel para importar un pedido en Tango Delta (Ventas → Pedidos →
 * Apertura → Excel → Importar).
 *
 * No se arma de cero: se parte de la planilla que exporta el propio Tango
 * ("Sin datos", plantillas/tango-pedidos.xlsx) y sólo se le agregan filas a
 * las hojas Pedidos y Renglones. El resto del archivo — la hoja _metadata con
 * la que Tango reconoce el proceso, las listas de códigos ocultas y las
 * validaciones — tiene que llegar intacto, o Tango rechaza el archivo. Por
 * eso se edita el XML adentro del zip en vez de pasarlo por una librería de
 * planillas, que reescribiría todo y perdería esas partes.
 *
 * Si Tango cambia de versión y el importador deja de aceptar el archivo, se
 * vuelve a exportar la planilla vacía desde Tango y se reemplaza el .xlsx.
 */

const PLANTILLA_TANGO_PEDIDOS = __DIR__ . '/../plantillas/tango-pedidos.xlsx';

/** Talonario "157 - Pedidos electrónicos", el que usan hoy para cargar pedidos. */
const TANGO_TALONARIO_PEDIDOS = '157';

/**
 * Depósito de Tango según la familia: Tolsen sale del depósito 02 y todo lo
 * demás (bulonería, mechas, electrodos) del 01 - Guiñazu. Se manda en el
 * encabezado y en cada renglón, como lo cargan a mano.
 */
const TANGO_DEPOSITOS = ['tolsen' => '02'];
const TANGO_DEPOSITO_POR_DEFECTO = '01';

/** Quién figura como autor del pedido en la Leyenda 1 de Tango. */
const TANGO_LEYENDA_ORIGEN = 'APP';

/** Las leyendas de Tango se cortan en 60 caracteres. */
const TANGO_LARGO_LEYENDA = 60;

/**
 * Los descuentos que ya trae aplicados el precio de cada renglón, en una línea
 * ("Dto flia 10% + cliente 5% + Contado 10%"), para que en Tango se vea de
 * dónde sale el precio aunque la bonificación vaya en 0.
 */
function resumenDescuentosTango(array $pedido, array $sub): string
{
    $porcentaje = fn(float $n) => rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.') . '%';
    $partes = [];
    $familia = (float) ($sub['descuentoFamilia'] ?? 0);
    if ($familia != 0.0) $partes[] = 'flia ' . $porcentaje($familia);
    $cliente = (float) ($pedido['descuento'] ?? 0);
    if ($cliente != 0.0) $partes[] = 'cliente ' . $porcentaje($cliente);
    $pago = trim((string) ($pedido['condicionPagoEtiqueta'] ?? ''));
    if ($pago !== '') $partes[] = $pago;
    return $partes ? 'Dto ' . implode(' + ', $partes) : 'Sin descuentos';
}

/**
 * El subpedido de una familia y sus renglones a facturar, igual que en la
 * proforma: lo que no hay no se factura. Lo usan el Excel y la API, para que
 * los dos manden a Tango exactamente lo mismo.
 */
function renglonesParaTango(array $pedido, string $familia): array
{
    foreach ($pedido['subpedidos'] as $s) {
        if ($s['familia'] !== $familia) continue;
        $items = array_values(array_filter($s['items'], fn($i) => $i['estado'] !== 'sin_stock'));
        if (!$items) throw new InvalidArgumentException('Esa familia no tiene nada para facturar');
        return [$s, $items];
    }
    throw new InvalidArgumentException('El pedido no tiene productos de esa familia');
}

/**
 * El código con el que Tango conoce al artículo.
 *
 * Bulonería, mechas y electrodos usan el mismo código en los dos lados.
 * Tolsen no: en Tango sus artículos llevan "TOL" adelante (79005 es TOL79005).
 * Y los códigos numéricos de Tango tienen siempre 8 dígitos: alguno llegó a la
 * app sin el cero de adelante (8711005 en vez de 08711005, quizás por pasar por
 * una planilla que lo tomó como número) y Tango no lo encontraría.
 */
function codigoArticuloTango(string $codigo, string $familia): string
{
    $prefijos = ['tolsen' => 'TOL'];
    $prefijo = $prefijos[$familia] ?? '';
    if ($prefijo !== '') {
        return str_starts_with($codigo, $prefijo) ? $codigo : $prefijo . $codigo;
    }
    if (ctype_digit($codigo) && strlen($codigo) < 8) {
        return str_pad($codigo, 8, '0', STR_PAD_LEFT);
    }
    return $codigo;
}

/** Número de columna (1 = A) a letra de Excel. */
function columnaExcel(int $n): string
{
    $letras = '';
    while ($n > 0) {
        $n--;
        $letras = chr(65 + $n % 26) . $letras;
        $n = intdiv($n, 26);
    }
    return $letras;
}

/**
 * Una celda en XML. El texto va como inlineStr para no tocar sharedStrings:
 * así un código como "00000001" llega como texto y no pierde los ceros.
 */
function celdaExcel(string $ref, $valor, ?int $estilo = null): string
{
    $s = $estilo !== null ? " s=\"$estilo\"" : '';
    if (is_int($valor) || is_float($valor)) {
        return "<c r=\"$ref\"$s><v>" . $valor . '</v></c>';
    }
    $texto = htmlspecialchars((string) $valor, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    return "<c r=\"$ref\"$s t=\"inlineStr\"><is><t xml:space=\"preserve\">$texto</t></is></c>";
}

/**
 * Filas de una hoja a partir de los encabezados de la plantilla.
 *
 * Cada fila es un mapa "encabezado exacto => valor"; lo que no se nombra
 * queda vacío y Tango le pone su valor por defecto. Se busca por el texto del
 * encabezado y no por la letra de columna, para que un orden distinto en otra
 * versión de la planilla no corra los datos de lugar.
 */
function filasExcel(array $encabezados, array $estilos, array $filas): string
{
    $xml = '';
    foreach ($filas as $i => $fila) {
        $r = $i + 2;
        $celdas = '';
        foreach ($encabezados as $col => $titulo) {
            if (!array_key_exists($titulo, $fila) || $fila[$titulo] === null || $fila[$titulo] === '') continue;
            $celdas .= celdaExcel(columnaExcel($col) . $r, $fila[$titulo], $estilos[$col] ?? null);
        }
        $xml .= "<row r=\"$r\">$celdas</row>";
    }
    return $xml;
}

/** Texto de los encabezados (fila 1) de una hoja, indexados por número de columna. */
function encabezadosHoja(string $hojaXml, array $compartidos): array
{
    preg_match('#<row r="1"[^>]*>(.*?)</row>#s', $hojaXml, $m);
    $encabezados = [];
    preg_match_all('#<c r="([A-Z]+)1"([^>]*)>(.*?)</c>#s', $m[1] ?? '', $celdas, PREG_SET_ORDER);
    foreach ($celdas as [, $letras, $atributos, $contenido]) {
        $col = 0;
        foreach (str_split($letras) as $letra) $col = $col * 26 + (ord($letra) - 64);
        if (str_contains($atributos, 't="s"')) {
            preg_match('#<v>(\d+)</v>#', $contenido, $v);
            $texto = $compartidos[(int) ($v[1] ?? -1)] ?? '';
        } else {
            $texto = strip_tags($contenido);
        }
        $encabezados[$col] = html_entity_decode($texto, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
    return $encabezados;
}

/** El estilo de cada columna (formato de fecha, número, texto) según <cols>. */
function estilosColumnas(string $hojaXml): array
{
    $estilos = [];
    preg_match_all('#<col min="(\d+)" max="(\d+)"[^>]*?style="(\d+)"#', $hojaXml, $cols, PREG_SET_ORDER);
    foreach ($cols as [, $min, $max, $estilo]) {
        for ($i = (int) $min; $i <= (int) $max; $i++) $estilos[$i] = (int) $estilo;
    }
    return $estilos;
}

/** Ruta dentro del zip de cada hoja, por nombre ("Pedidos" => "xl/worksheets/sheet2.xml"). */
function hojasDelLibro(ZipArchive $zip): array
{
    $libro = $zip->getFromName('xl/workbook.xml');
    $rels = $zip->getFromName('xl/_rels/workbook.xml.rels');

    $destinos = [];
    preg_match_all('#<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"#', $rels, $m, PREG_SET_ORDER);
    foreach ($m as [, $id, $target]) $destinos[$id] = 'xl/' . ltrim($target, '/');
    preg_match_all('#<Relationship [^>]*Target="([^"]+)"[^>]*Id="([^"]+)"#', $rels, $m, PREG_SET_ORDER);
    foreach ($m as [, $target, $id]) $destinos[$id] = 'xl/' . ltrim($target, '/');

    $hojas = [];
    preg_match_all('#<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"#', $libro, $m, PREG_SET_ORDER);
    foreach ($m as [, $nombre, $rid]) {
        $hojas[html_entity_decode($nombre, ENT_XML1 | ENT_QUOTES, 'UTF-8')] = $destinos[$rid] ?? null;
    }
    return $hojas;
}

/** Textos compartidos del libro, en orden (los encabezados están ahí). */
function textosCompartidos(ZipArchive $zip): array
{
    $xml = $zip->getFromName('xl/sharedStrings.xml');
    if ($xml === false) return [];
    preg_match_all('#<si>(.*?)</si>#s', $xml, $si);
    return array_map(function ($frag) {
        preg_match_all('#<t[^>]*>([^<]*)</t>#', $frag, $t);
        return implode('', $t[1]);
    }, $si[1]);
}

/** Agrega las filas a una hoja de la plantilla, dejando todo lo demás como está. */
function llenarHoja(ZipArchive $zip, string $ruta, array $compartidos, array $filas): void
{
    $xml = $zip->getFromName($ruta);
    $encabezados = encabezadosHoja($xml, $compartidos);

    $desconocidos = array_diff(array_unique(array_merge(...array_map('array_keys', $filas))), $encabezados);
    if ($desconocidos) {
        throw new RuntimeException('La planilla de Tango no tiene las columnas: ' . implode(', ', $desconocidos));
    }

    $nuevas = filasExcel($encabezados, estilosColumnas($xml), $filas);
    $ultima = columnaExcel(max(array_keys($encabezados))) . (count($filas) + 1);

    $xml = preg_replace('#<dimension ref="[^"]*"/>#', "<dimension ref=\"A1:$ultima\"/>", $xml, 1);
    $xml = str_replace('</sheetData>', $nuevas . '</sheetData>', $xml);
    $zip->addFromString($ruta, $xml);
}

/** Fecha como número de serie de Excel, que es como la espera la columna. */
function fechaExcel(DateTimeInterface $fecha): int
{
    $base = new DateTimeImmutable('1899-12-30');
    return (int) $base->diff(new DateTimeImmutable($fecha->format('Y-m-d')))->days;
}

/**
 * Arma el Excel de UNA familia del pedido: en Tango cada familia es una
 * factura aparte, aunque el cliente sea el mismo.
 *
 * Devuelve el contenido binario del .xlsx.
 */
function excelPedidoTango(array $pedido, string $familia, ?string $etiquetaFamilia = null, array $tango = []): string
{
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('El servidor no tiene la extensión zip de PHP activa');
    }

    // La cantidad de cada renglón es la que confirmó el depósito si la tocó.
    [$sub, $items] = renglonesParaTango($pedido, $familia);

    $codigoCliente = $pedido['cliente']['codigoCliente'] ?? '';
    if ($codigoCliente === '') {
        throw new InvalidArgumentException('El cliente no tiene código de Tango cargado en su ficha');
    }

    $numeroProforma = substr((string) $pedido['id'], -8);
    $nombreFamilia = $etiquetaFamilia ?: $familia;

    // Un pedido por archivo, así que el identificador que une el encabezado
    // con sus renglones es siempre 1.
    $deposito = TANGO_DEPOSITOS[$familia] ?? TANGO_DEPOSITO_POR_DEFECTO;
    $descuentos = resumenDescuentosTango($pedido, $sub);

    $encabezado = [[
        'Identificador' => 1,
        'Código de talonario' => TANGO_TALONARIO_PEDIDOS,
        'Fecha' => fechaExcel(new DateTimeImmutable()),
        'Código de cliente' => $codigoCliente,
        // Condición de venta, vendedor y lista no se mandan: Tango toma los de la
        // ficha del cliente, salvo que el llamador los pase en $tango.
        'Código de condición de venta' => $tango['condicion'] ?? null,
        'Código de vendedor' => $tango['vendedor'] ?? null,
        'Código de depósito' => $deposito,
        'Leyenda 1' => TANGO_LEYENDA_ORIGEN,
        'Leyenda 2' => mb_substr("Proforma $numeroProforma - $descuentos", 0, TANGO_LARGO_LEYENDA),
        // Los precios que van en los renglones ya tienen aplicados todos los
        // descuentos de la proforma (familia, producto, cliente y condición
        // de pago). Si Tango sumara además la bonificación del cliente o una
        // promoción, el cliente terminaría pagando menos de lo cotizado.
        'Porcentaje de bonificación general' => 0,
        'Aplica bonificación de cliente' => 'No',
        'Calcula promociones' => 'No',
        'Observaciones' => "Proforma N° $numeroProforma — $nombreFamilia. $descuentos. Los precios ya llevan los descuentos aplicados.",
    ]];

    $renglones = [];
    foreach ($items as $n => $it) {
        $renglones[] = [
            'Identificador' => 1,
            'Nro.' => $n + 1,
            'Código de artículo' => codigoArticuloTango((string) $it['codigo'], $familia),
            'Código de depósito' => $deposito,
            'Cantidad pedida' => (float) ($it['cantidadConfirmada'] ?? $it['cantidad']),
            // Precio unitario neto, sin IVA: Tango calcula el IVA según la
            // alícuota del artículo al facturar.
            'Precio' => round((float) $it['precioNeto'], 4),
            'Bonificación' => 0,
        ];
    }

    $tmp = tempnam(sys_get_temp_dir(), 'tango');
    if (!copy(PLANTILLA_TANGO_PEDIDOS, $tmp)) {
        throw new RuntimeException('No se encontró la plantilla de Tango');
    }

    try {
        $zip = new ZipArchive();
        if ($zip->open($tmp) !== true) throw new RuntimeException('No se pudo abrir la plantilla de Tango');

        $hojas = hojasDelLibro($zip);
        $compartidos = textosCompartidos($zip);
        foreach (['Pedidos' => $encabezado, 'Renglones' => $renglones] as $hoja => $filas) {
            if (empty($hojas[$hoja])) throw new RuntimeException("La plantilla de Tango no tiene la hoja $hoja");
            llenarHoja($zip, $hojas[$hoja], $compartidos, $filas);
        }
        $zip->close();

        return file_get_contents($tmp);
    } finally {
        @unlink($tmp);
    }
}
