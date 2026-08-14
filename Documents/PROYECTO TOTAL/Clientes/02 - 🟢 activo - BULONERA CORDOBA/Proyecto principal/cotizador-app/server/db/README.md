# Las migraciones se mudaron

El esquema vive ahora en **`api-php/db/`**, como una cadena de migraciones numeradas
que se aplican con el runner:

```bash
npm run migrate            # aplica lo que falte
node server/dev-php.mjs api-php/migrate.php --estado   # sólo informa
```

| Archivo | Qué hace |
|---|---|
| `001-esquema.sql` | Tablas base: clientes, productos, personal, aprobaciones… |
| `002-configuraciones.sql` | Tabla `configuraciones` y sus valores iniciales (V002) |
| `003-electrodos-y-stock.sql` | Familia Electrodos, depósitos y revisión de stock (V003) |
| `004-motor-descuentos.sql` | Desglose de precios, log de auditoría, pedido directo (V004) |
| `005-backfill-desglose.sql` | Completa el desglose de los pedidos que ya existían |

Cada migración queda anotada en la tabla `migraciones`, así que correr el runner
dos veces no rompe nada.

## Por qué se movieron

Antes había un `schema.sql` acá que se fue quedando viejo: no tenía la tabla
`configuraciones` de V002 ni las columnas de V003. Levantar el proyecto desde
cero con ese archivo daba una base incompleta. Además `migrate.php` buscaba los
`.sql` en `api-php/db/`, un directorio que no existía, así que fallaba siempre.

Ahora hay un solo lugar y una sola forma de llegar al esquema actual.
