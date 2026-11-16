<?php
/**
 * Cliente de la API REST de Tango Delta (doc oficial y código de ejemplo:
 * github.com/TangoSoftware/TangoDeltaApi).
 *
 * Todas las llamadas van a `{url}/api/{acción}?process={id}` con dos headers:
 *   ApiAuthorization: el token que se genera en Tango
 *   Company:          el id de la empresa (CORDOBA BULONES SA es la 7)
 *
 * El servidor de la bulonera está en su red, no en Hostinger: la `url` tiene
 * que ser una dirección que Hostinger pueda alcanzar (túnel o IP pública).
 *
 * Ojo con dos cosas que dice el repo oficial:
 *  - Pedidos no soporta PUT ni DELETE todavía: lo que se carga por acá sólo se
 *    puede corregir o borrar desde Tango.
 *  - La API pide ids internos (ID_STA11, ID_GVA14…), no códigos. Para pasar de
 *    código a id se consulta antes la tabla con `idPorCodigo` (ver idsPedidoTango).
 */

require_once __DIR__ . '/tango.php';

/**
 * Número de proceso de cada cosa que se consulta en Tango.
 *
 * Son los del repo oficial (*Services.cs); el de pedidos coincide con la
 * pantalla web de la bulonera (/voucher/19845). Pero cambian de una
 * instalación a otra — en otra que se vio, clientes era 2567 y artículos 418 —,
 * así que se pueden pisar desde Integraciones (clave tangoProcesos, un JSON).
 */
const TANGO_PROCESOS_POR_DEFECTO = [
    'pedidos' => 19845,
    'articulos' => 87,
    'clientes' => 2117,
    'depositos' => 2941,
    'monedas' => 1660,
    'transportes' => 960,
];

/**
 * Transporte para los clientes que no tienen uno en su ficha de Tango: el
 * "00", que en este Tango es el que no indica transporte (figura con guiones).
 * Tango rechaza el pedido sin transporte ("El campo ID_GVA24 es requerido").
 */
const TANGO_TRANSPORTE_SIN_FICHA = '00';

/** Estado con el que Tango guarda el pedido: 2 = Aprobado (el que usa el ejemplo oficial). */
const TANGO_ESTADO_APROBADO = 2;

/** Moneda de los pedidos: en este Tango los pesos son CTE (la otra es EXT). */
const TANGO_MONEDA_PEDIDOS = 'CTE';

/** Unidad de medida de cada renglón: la de ventas, como en el ejemplo oficial. */
const TANGO_MODULO_UNIDAD_MEDIDA = 'GV';

class TangoApiException extends RuntimeException
{
    /** Detalle técnico que devolvió Tango, si lo hubo. */
    public ?string $detalle;

    public function __construct(string $mensaje, ?string $detalle = null, int $codigo = 0)
    {
        parent::__construct($mensaje, $codigo);
        $this->detalle = $detalle;
    }
}

class TangoApi
{
    private string $url;
    private string $token;
    private string $empresa;
    private int $timeout;
    /** Headers que se suman a todas las llamadas (la credencial del túnel, si hay uno). */
    private array $cabecerasExtra;
    /** Número de proceso por nombre: los por defecto, pisados por los de Integraciones. */
    private array $procesos;

    public function __construct(string $url, string $token, string $empresa = '7', int $timeout = 20, array $cabecerasExtra = [], array $procesos = [])
    {
        if ($url === '' || $token === '') {
            throw new TangoApiException('Falta la dirección o el token de Tango en Integraciones');
        }
        $this->url = rtrim($url, '/');
        $this->token = $token;
        $this->empresa = $empresa;
        $this->timeout = $timeout;
        $this->cabecerasExtra = $cabecerasExtra;
        $this->procesos = array_merge(TANGO_PROCESOS_POR_DEFECTO, array_map('intval', array_filter($procesos)));
    }

    /**
     * Arma el cliente con lo guardado en la tabla config (Integraciones).
     * Claves: tangoApiKey (token), tangoUrl y tangoEmpresa (7 si no está).
     * tangoClavePuente es la clave del Worker de Cloudflare que hace de puente
     * hasta el servidor de la bulonera (app/puente-tango): va en cada llamada
     * y sin ella el puente no deja pasar. tangoProcesos es un JSON con los
     * números de proceso que difieran de los por defecto.
     */
    public static function desdeConfig(PDO $pdo): self
    {
        $cfg = [];
        $claves = "'tangoApiKey','tangoUrl','tangoEmpresa','tangoClavePuente','tangoProcesos'";
        foreach ($pdo->query("SELECT clave, valor FROM config WHERE clave IN ($claves)")->fetchAll() as $r) {
            $cfg[$r['clave']] = $r['valor'];
        }
        $extra = empty($cfg['tangoClavePuente']) ? [] : ['X-Clave-Puente: ' . $cfg['tangoClavePuente']];
        $procesos = json_decode($cfg['tangoProcesos'] ?? '', true);
        return new self($cfg['tangoUrl'] ?? '', $cfg['tangoApiKey'] ?? '', $cfg['tangoEmpresa'] ?? '7', 20, $extra,
            is_array($procesos) ? $procesos : []);
    }

    /** El número de proceso de 'pedidos', 'clientes', 'articulos', etc. */
    public function proceso(string $nombre): int
    {
        if (empty($this->procesos[$nombre])) {
            throw new TangoApiException("Falta el número de proceso de $nombre en Integraciones");
        }
        return $this->procesos[$nombre];
    }

    /** Una página de registros del proceso. Devuelve la lista (array de filas). */
    public function listar(int $proceso, int $porPagina = 50, int $pagina = 0): array
    {
        $r = $this->pedir('GET', 'Get', [
            'process' => $proceso, 'pageSize' => $porPagina, 'pageIndex' => $pagina, 'view' => '',
        ]);
        return $r['resultData']['list'] ?? [];
    }

    /** Un registro por su id interno, o null si no existe. */
    public function porId(int $proceso, int $id): ?array
    {
        $r = $this->pedir('GET', 'GetById', ['process' => $proceso, 'view' => '', 'id' => $id]);
        return $r['value'] ?? null;
    }

    /**
     * Registros que cumplen un filtro SQL (lo que va después de WHERE).
     * El filtro va tal cual a Tango: los valores tienen que pasar por
     * `literalSql` y los nombres de campo por `buscarPorCodigo`.
     */
    public function filtrar(int $proceso, string $dondeSql): array
    {
        $r = $this->pedir('GET', 'GetByFilter', [
            'process' => $proceso, 'view' => '', 'filtroSql' => 'WHERE ' . $dondeSql,
        ]);
        return $r['list'] ?? [];
    }

    /** Texto entre comillas simples y con las comillas internas duplicadas. */
    public static function literalSql(string $valor): string
    {
        return "'" . str_replace("'", "''", $valor) . "'";
    }

    /** La fila cuyo campo de código vale $codigo, o null. Ej: ('COD_STA11', '08711005'). */
    public function buscarPorCodigo(int $proceso, string $campoCodigo, string $codigo): ?array
    {
        if (!preg_match('/^[A-Z0-9_]+$/', $campoCodigo)) {
            throw new InvalidArgumentException('Nombre de campo inválido');
        }
        $filas = $this->filtrar($proceso, "$campoCodigo = " . self::literalSql($codigo));
        return $filas[0] ?? null;
    }

    /**
     * El id interno del registro cuyo código vale $codigo, o null si no está.
     * $campoCodigo va con la tabla adelante, como en el repo oficial
     * ('AXV_CLIENTE.COD_GVA14'); $campoId es la columna del id ('ID_GVA14').
     */
    public function idPorCodigo(int $proceso, string $campoCodigo, string $codigo, string $campoId): ?int
    {
        if (!preg_match('/^[A-Z0-9_]+(\.[A-Z0-9_]+)?$/', $campoCodigo)) {
            throw new InvalidArgumentException('Nombre de campo inválido');
        }
        $fila = $this->filtrar($proceso, "$campoCodigo = " . self::literalSql($codigo))[0] ?? null;
        return isset($fila[$campoId]) ? (int) $fila[$campoId] : null;
    }

    /**
     * Da de alta un registro y devuelve el id que le puso Tango.
     * Con un error de Tango (código inexistente, dato faltante) lanza
     * TangoApiException con el mensaje y el detalle que devolvió.
     */
    public function crear(int $proceso, array $datos): int
    {
        $r = $this->pedir('POST', 'Create', ['process' => $proceso], $datos);
        $ok = $r['succeeded'] ?? $r['Succeeded'] ?? false;
        if (!$ok) {
            $mensaje = $r['message'] ?? $r['Message'] ?? 'Tango rechazó el alta';
            $detalle = $r['exceptionInfo'] ?? $r['ExceptionInfo'] ?? null;
            // exceptionInfo trae title, messages y detailMessages: se juntan los
            // mensajes, que son los que dicen qué dato no le gustó a Tango.
            if (is_array($detalle)) {
                $lineas = array_merge((array) ($detalle['messages'] ?? []), (array) ($detalle['detailMessages'] ?? []));
                $detalle = $lineas ? implode(' | ', $lineas) : json_encode($detalle, JSON_UNESCAPED_UNICODE);
            }
            throw new TangoApiException($mensaje, $detalle);
        }
        return (int) ($r['savedId'] ?? $r['SavedId'] ?? 0);
    }

    /** Lectura mínima para confirmar que la dirección, el token y la empresa andan. */
    public function probarConexion(): array
    {
        $filas = $this->listar($this->proceso('articulos'), 1, 0);
        return ['ok' => true, 'articulosLeidos' => count($filas)];
    }

    private function pedir(string $metodo, string $accion, array $query, ?array $cuerpo = null): array
    {
        if (!function_exists('curl_init')) {
            throw new TangoApiException('El servidor no tiene la extensión curl de PHP activa');
        }
        $ch = curl_init("{$this->url}/api/$accion?" . http_build_query($query, '', '&', PHP_QUERY_RFC3986));
        $headers = [
            'Accept: application/json',
            'ApiAuthorization: ' . $this->token,
            'Company: ' . $this->empresa,
        ];
        $opciones = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_CUSTOMREQUEST => $metodo,
        ];
        if ($cuerpo !== null) {
            $headers[] = 'Content-Type: application/json';
            $opciones[CURLOPT_POSTFIELDS] = json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        }
        $opciones[CURLOPT_HTTPHEADER] = array_merge($headers, $this->cabecerasExtra);
        curl_setopt_array($ch, $opciones);

        $texto = curl_exec($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $falla = curl_error($ch);
        curl_close($ch);

        if ($texto === false) {
            throw new TangoApiException('No se pudo conectar con Tango: ' . $falla);
        }
        if ($http === 401 || $http === 403) {
            throw new TangoApiException('Tango rechazó el token o la empresa (HTTP ' . $http . ')', null, $http);
        }
        $json = json_decode($texto, true);
        if ($http >= 400 || !is_array($json)) {
            throw new TangoApiException("Tango respondió HTTP $http", mb_substr((string) $texto, 0, 500), $http);
        }
        return $json;
    }
}

/**
 * El JSON de un pedido de Tango (PedidoData) a partir del pedido de la app y
 * de una familia. Es una función pura: no llama a Tango, así se puede mirar
 * qué se mandaría antes de mandarlo.
 *
 * $ids trae lo que hay que resolver antes contra Tango, todo como ids internos:
 *   cliente, talonario, talonarioFactura, moneda,
 *   condicionVenta, vendedor, lista, transporte (opcionales),
 *   depositos => ['01' => id, '02' => id]   (por código de depósito)
 *   articulos => ['08711005' => id, ...]    (por código de Tango del artículo)
 *
 * Igual que en el Excel: el precio de cada renglón ya trae todos los
 * descuentos de la proforma, así que la bonificación va en 0 y el detalle de
 * los descuentos queda en las observaciones.
 */
function pedidoTangoDesdeApp(array $pedido, string $familia, array $ids, ?string $etiquetaFamilia = null): array
{
    [$sub, $items] = renglonesParaTango($pedido, $familia);

    $codigoDeposito = TANGO_DEPOSITOS[$familia] ?? TANGO_DEPOSITO_POR_DEFECTO;
    $idDeposito = $ids['depositos'][$codigoDeposito] ?? null;
    if ($idDeposito === null) {
        throw new InvalidArgumentException("Falta el id de Tango del depósito $codigoDeposito");
    }

    $numeroProforma = substr((string) $pedido['id'], -8);
    $nombreFamilia = $etiquetaFamilia ?: $familia;
    $descuentos = resumenDescuentosTango($pedido, $sub);

    $renglones = [];
    foreach ($items as $it) {
        $codigoTango = codigoArticuloTango((string) $it['codigo'], $familia);
        $idArticulo = $ids['articulos'][$codigoTango] ?? null;
        if ($idArticulo === null) {
            throw new InvalidArgumentException("El artículo $codigoTango no existe en Tango");
        }
        $renglones[] = [
            'ID_STA11' => $idArticulo,
            'ID_STA22' => $idDeposito,
            'MODULO_UNIDAD_MEDIDA' => TANGO_MODULO_UNIDAD_MEDIDA,
            'CANTIDAD_PEDIDA' => (float) ($it['cantidadConfirmada'] ?? $it['cantidad']),
            'PRECIO' => round((float) $it['precioNeto'], 4),
            'PORCENTAJE_BONIFICACION' => 0,
        ];
    }

    $cabecera = [
        'ID_GVA21' => 0,
        'ID_GVA43_TALON_PED' => $ids['talonario'],
        'ESTADO' => TANGO_ESTADO_APROBADO,
        'FECHA_PEDIDO' => (new DateTimeImmutable('today', new DateTimeZone('America/Argentina/Cordoba')))->format('c'),
        'ES_CLIENTE_HABITUAL' => true,
        'ID_GVA14' => $ids['cliente'],
        'ID_STA22' => $idDeposito,
        'ID_MONEDA' => $ids['moneda'],
        'COTIZACION' => 1,
        'ID_GVA43_TALONARIO_FACTURA' => $ids['talonarioFactura'] ?? null,
        // Leyenda 1 libre. El número de proforma y los descuentos van en las observaciones.
        'LEYENDA_2' => TANGO_LEYENDA_2,
        'LEYENDA_3' => TANGO_LEYENDA_3,
        'LEYENDA_4' => TANGO_LEYENDA_4,
        'PORCENTAJE_DESCUENTO_GENERAL' => 0,
        'IMPORTE_DESCUENTO_GENERAL' => 0,
        'PORCENTAJE_RECARGO_GENERAL' => 0,
        'IMPORTE_RECARGO_GENERAL' => 0,
        'APLICA_DESCUENTO_CLIENTE' => false,
        'CALCULA_PROMOCIONES' => false,
        'VALIDA_LIMITE_CREDITO' => false,
        'OBSERVACIONES' => "Proforma N° $numeroProforma — $nombreFamilia. $descuentos. Los precios ya llevan los descuentos aplicados.",
        'RENGLON_DTO' => $renglones,
    ];

    // Lo opcional: si no se resolvió, no se manda y Tango usa lo de la ficha del cliente.
    foreach (['condicionVenta' => 'ID_GVA01', 'vendedor' => 'ID_GVA23', 'lista' => 'ID_GVA10', 'transporte' => 'ID_GVA24'] as $clave => $campo) {
        if (!empty($ids[$clave])) $cabecera[$campo] = $ids[$clave];
    }

    // Modelo de asiento: sin él no se puede facturar el pedido desde Tango.
    if (!empty($ids['modeloAsiento'])) {
        [$campoAsiento, $idAsiento] = $ids['modeloAsiento'];
        $cabecera[$campoAsiento] = $idAsiento;
    }

    return array_filter($cabecera, fn($v) => $v !== null);
}

/**
 * Los ids internos que pide pedidoTangoDesdeApp, buscados en Tango a partir
 * de los códigos que tiene la app. Los filtros son los del ejemplo oficial
 * (PedidosApiConsole/Program.cs). Si falta algo corta antes de mandar nada y
 * dice qué código no encontró, así se corrige la ficha y no queda un pedido
 * a medias en Tango.
 */
function idsPedidoTango(TangoApi $api, array $pedido, string $familia, int $idTalonario): array
{
    [, $items] = renglonesParaTango($pedido, $familia);

    $codigoCliente = (string) ($pedido['cliente']['codigoCliente'] ?? '');
    if ($codigoCliente === '') {
        throw new InvalidArgumentException('El cliente no tiene código de Tango cargado en su ficha');
    }
    $ficha = $api->filtrar($api->proceso('clientes'), 'AXV_CLIENTE.COD_GVA14 = ' . TangoApi::literalSql($codigoCliente))[0] ?? null;
    if (empty($ficha['ID_GVA14'])) throw new InvalidArgumentException("El cliente $codigoCliente no existe en Tango");
    $cliente = (int) $ficha['ID_GVA14'];

    // Tango no acepta un pedido sin transporte: va el de la ficha del cliente
    // y, si la ficha no tiene, el que no indica transporte.
    $codigoTransporte = trim((string) ($ficha['GVA24_CODIGO'] ?? '')) ?: TANGO_TRANSPORTE_SIN_FICHA;
    $transporte = $api->idPorCodigo($api->proceso('transportes'), 'GVA24.COD_TRANSP', $codigoTransporte, 'ID_GVA24');
    if (!$transporte) throw new InvalidArgumentException("El transporte $codigoTransporte no existe en Tango");

    $codigoDeposito = TANGO_DEPOSITOS[$familia] ?? TANGO_DEPOSITO_POR_DEFECTO;
    $deposito = $api->idPorCodigo($api->proceso('depositos'), 'STA22.COD_STA22', $codigoDeposito, 'ID_STA22');
    if (!$deposito) throw new InvalidArgumentException("El depósito $codigoDeposito no existe en Tango");

    $moneda = $api->idPorCodigo($api->proceso('monedas'), 'MONEDA.COD_MONEDA', TANGO_MONEDA_PEDIDOS, 'ID_MONEDA');
    if (!$moneda) throw new InvalidArgumentException('La moneda ' . TANGO_MONEDA_PEDIDOS . ' no existe en Tango');

    // Uno por código: un artículo repetido en dos renglones se busca una vez.
    $articulos = [];
    foreach ($items as $it) {
        $codigo = codigoArticuloTango((string) $it['codigo'], $familia);
        if (isset($articulos[$codigo])) continue;
        $id = $api->idPorCodigo($api->proceso('articulos'), 'AXV_ARTICULO.COD_STA11', $codigo, 'ID_STA11');
        if (!$id) throw new InvalidArgumentException("El artículo $codigo no existe en Tango");
        $articulos[$codigo] = $id;
    }

    return [
        'cliente' => $cliente,
        'transporte' => $transporte,
        'talonario' => $idTalonario,
        'moneda' => $moneda,
        'depositos' => [$codigoDeposito => $deposito],
        'articulos' => $articulos,
    ];
}

/**
 * El id interno del talonario de pedidos (el 157).
 *
 * La API no tiene un proceso de talonarios, así que se saca de un pedido que
 * ya esté cargado con ese talonario: la lista de pedidos trae el código del
 * talonario y el pedido completo trae su id. Busca entre los últimos 50.
 */
function buscarIdTalonarioPedidosTango(TangoApi $api): int
{
    foreach ($api->listar($api->proceso('pedidos'), 50, 0) as $fila) {
        if ((string) ($fila['TALONARIO_PEDIDO'] ?? '') !== TANGO_TALONARIO_PEDIDOS || empty($fila['ID_GVA21'])) continue;
        $id = (int) ($api->porId($api->proceso('pedidos'), (int) $fila['ID_GVA21'])['ID_GVA43_TALON_PED'] ?? 0);
        if ($id > 0) return $id;
    }
    throw new TangoApiException('No encontré en Tango un pedido con el talonario ' . TANGO_TALONARIO_PEDIDOS . ' para saber su número interno');
}

/**
 * El modelo de asiento de los pedidos de facturación, como [campo, id], o null.
 *
 * Sin modelo de asiento Tango no deja facturar el pedido. La API no tiene un
 * proceso para esos modelos, así que se copia el de los pedidos que ya están
 * cargados con el talonario 157: se busca, en el pedido completo, el primer
 * campo que tenga "ASIENTO" en el nombre con un id cargado. Si no hay ninguno
 * se devuelve null y el pedido va como antes (se completa a mano en Tango).
 * Se busca una sola vez y queda en config (tangoModeloAsiento, un JSON
 * {"campo":"...","id":N}); también se puede cargar a mano desde ahí.
 */
function modeloAsientoPedidosTango(TangoApi $api, PDO $pdo): ?array
{
    $guardado = json_decode((string) $pdo->query("SELECT valor FROM config WHERE clave = 'tangoModeloAsiento'")->fetchColumn(), true);
    if (is_array($guardado) && !empty($guardado['campo']) && !empty($guardado['id'])) {
        return [(string) $guardado['campo'], (int) $guardado['id']];
    }

    foreach ($api->listar($api->proceso('pedidos'), 50, 0) as $fila) {
        if ((string) ($fila['TALONARIO_PEDIDO'] ?? '') !== TANGO_TALONARIO_PEDIDOS || empty($fila['ID_GVA21'])) continue;
        $completo = $api->porId($api->proceso('pedidos'), (int) $fila['ID_GVA21']) ?? [];
        foreach ($completo as $campo => $valor) {
            if (stripos((string) $campo, 'ASIENTO') === false || !is_numeric($valor) || (int) $valor <= 0) continue;
            $pdo->prepare('INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)')
                ->execute(['tangoModeloAsiento', json_encode(['campo' => $campo, 'id' => (int) $valor])]);
            return [(string) $campo, (int) $valor];
        }
    }
    return null;
}

/** Lo mismo, pero se busca una sola vez y queda guardado en config (tangoIdTalonario). */
function idTalonarioPedidosTango(TangoApi $api, PDO $pdo): int
{
    $guardado = $pdo->query("SELECT valor FROM config WHERE clave = 'tangoIdTalonario'")->fetchColumn();
    if ($guardado !== false && ctype_digit((string) $guardado)) return (int) $guardado;

    $id = buscarIdTalonarioPedidosTango($api);
    $pdo->prepare('INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)')
        ->execute(['tangoIdTalonario', (string) $id]);
    return $id;
}
