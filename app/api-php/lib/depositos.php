<?php
/**
 * Depósitos: qué familia despacha cada uno y quién lo tiene a cargo.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/precios.php';

/**
 * Los depósitos configurados, cada uno con las familias que despacha.
 *
 * Familia y depósito son cosas distintas: la familia es del producto y define
 * su descuento (son cuatro), el depósito es de dónde sale la mercadería (son
 * dos). Un depósito agrupa una o más familias, y eso se configura — mover una
 * familia de depósito no requiere tocar ningún pedido ya emitido.
 */
function depositosConfigurados(PDO $pdo): array
{
    static $cache = null;
    if ($cache !== null) return $cache;

    $stmt = $pdo->query("SELECT valor FROM configuraciones WHERE clave = 'depositos' AND activo = 1");
    $fila = $stmt->fetch();
    $lista = $fila ? json_decode($fila['valor'], true) : null;

    // Si la configuración falta o quedó corrupta, un solo depósito con todo
    // adentro: es preferible que se vea todo junto y no que desaparezcan items.
    if (!is_array($lista) || !$lista) {
        $lista = [[
            'numero' => 1,
            'nombre' => 'Depósito',
            'familias' => clavesDeFamilia($pdo),
            'responsableId' => null,
        ]];
    }

    // Una familia que no figure en ningún depósito dejaría el pedido trabado:
    // nadie tendría a quién aprobarle esa parte y no avanzaría nunca. Se la
    // queda el primer depósito hasta que alguien la ubique donde va.
    $asignadas = [];
    foreach ($lista as $dep) {
        foreach ($dep['familias'] ?? [] as $f) $asignadas[$f] = true;
    }
    $huerfanas = array_diff(clavesDeFamilia($pdo), array_keys($asignadas));
    if ($huerfanas) {
        $lista[0]['familias'] = array_values(array_merge($lista[0]['familias'] ?? [], $huerfanas));
    }

    return $cache = $lista;
}

/** El depósito al que le toca una familia, o null si ninguno la reclama. */
function depositoDeFamilia(PDO $pdo, string $familia): ?array
{
    foreach (depositosConfigurados($pdo) as $dep) {
        if (in_array($familia, $dep['familias'] ?? [], true)) return $dep;
    }
    return null;
}

/**
 * Las familias que puede ver este usuario, o null si puede ver todas.
 * Un responsable de depósito ve todas las familias de su depósito.
 */
function familiasDelResponsable(PDO $pdo, string $usuarioId): ?array
{
    foreach (depositosConfigurados($pdo) as $dep) {
        if (($dep['responsableId'] ?? null) === $usuarioId) {
            return $dep['familias'] ?? [];
        }
    }
    return null;
}

/**
 * Las familias que este usuario puede ver y tocar, o null si no tiene límite.
 * Un responsable de depósito queda acotado a las familias que ese depósito
 * despacha; los administradores ven todo.
 */
function familiaPermitida(PDO $pdo, array $auth): ?array
{
    if (($auth['rol'] ?? '') === 'Administrador') return null; // sin restricción
    return familiasDelResponsable($pdo, $auth['id']);
}

/**
 * Arma varios pedidos con tres consultas en total.
 *
 * Antes se consultaban los items de cada familia de cada pedido por separado:
 * la pantalla de Depósito disparaba cientos de consultas y se iba poniendo
 * lenta a medida que se acumulaban pedidos.
 */
