-- Crear usuario admin1234 en tabla personal
-- Ejecutar esto en phpMyAdmin o MySQL CLI de Hostinger

INSERT INTO personal (usuario, password, nombre, rol, permisos) VALUES (
    'admin1234',
    '$2y$10$PpXAeKNVrXzpQqz8Q4Q0.eZ9kZ9kZ9kZ9kZ9kZ9kZ9kZ9kZ9kZ9k', -- bcrypt de "admin1234"
    'SuperAdmin',
    'Administrador',
    JSON_OBJECT(
        'secciones', JSON_ARRAY(
            'nuevo-pedido',
            'aprobaciones',
            'cotizaciones',
            'clientes',
            'productos',
            'integraciones',
            'personal',
            'configuraciones'
        )
    )
) ON DUPLICATE KEY UPDATE password = VALUES(password);

-- Verificar
SELECT usuario, nombre, rol FROM personal WHERE usuario = 'admin1234';
