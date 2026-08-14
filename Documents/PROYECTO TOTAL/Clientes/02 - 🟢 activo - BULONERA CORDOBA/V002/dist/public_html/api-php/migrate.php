<?php
/**
 * Script de migración - Aplica cambios de esquema
 * Ejecutar: php api-php/migrate.php
 */

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/config.php';

try {
    $pdo = obtenerPDO();

    echo "🔄 Verificando tabla configuraciones...\n";

    // Verificar si la tabla existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'configuraciones'");
    $existe = $stmt->rowCount() > 0;

    if (!$existe) {
        echo "📝 Creando tabla configuraciones...\n";

        $sql = file_get_contents(__DIR__ . '/db/002-configuraciones.sql');
        $pdo->exec($sql);

        echo "✅ Tabla configuraciones creada exitosamente\n";
    } else {
        echo "✅ Tabla configuraciones ya existe\n";

        // Verificar si faltan datos iniciales
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM configuraciones");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $cnt = $row['cnt'];

        if ($cnt === 0) {
            echo "📝 Insertando datos iniciales...\n";

            // Leer SQL y ejecutar solo los INSERT
            $sql = file_get_contents(__DIR__ . '/db/002-configuraciones.sql');
            $inserts = explode(';', $sql);

            foreach ($inserts as $stmt_sql) {
                if (trim($stmt_sql) && strpos($stmt_sql, 'INSERT') !== false) {
                    $pdo->exec($stmt_sql);
                }
            }

            echo "✅ Datos iniciales insertados\n";
        } else {
            echo "✅ Ya hay $cnt configuraciones registradas\n";
        }
    }

    echo "\n✅ Migración completada exitosamente\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
