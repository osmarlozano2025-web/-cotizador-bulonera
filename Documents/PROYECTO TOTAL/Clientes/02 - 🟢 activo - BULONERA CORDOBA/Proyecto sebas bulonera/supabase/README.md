# Supabase

Esta carpeta contiene la base inicial para conectar el ERP con Supabase.

Contenido:

- `config.toml`: configuración local de Supabase.
- `migrations/`: migraciones SQL versionadas.
- `seed.sql`: datos de demostración.

Notas:

- No se guardan secretos en este directorio.
- El cliente del navegador debe usar únicamente `VITE_SUPABASE_ANON_KEY`.
- La integración real debe avanzar por capas, manteniendo los repositorios mock como fallback hasta validar cada módulo.
