<?php
require_once __DIR__ . '/lib/env.php';
cargarEnv(__DIR__ . '/.env');

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'port' => getenv('DB_PORT') ?: '3306',
        'user' => getenv('DB_USER') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: '',
        'database' => getenv('DB_NAME') ?: 'cordoba_bulones',
    ],
    'jwt_secret' => getenv('JWT_SECRET') ?: '',
    'openai_api_key' => getenv('OPENAI_API_KEY') ?: '',
];
