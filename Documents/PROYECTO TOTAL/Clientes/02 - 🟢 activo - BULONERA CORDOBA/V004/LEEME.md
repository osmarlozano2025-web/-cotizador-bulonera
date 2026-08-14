# V004 — Motor de descuentos, nota de depósito, pedido directo y trazabilidad

## Para subir

Todo lo que hay en `dist\public_html\` va a `public_html` de Hostinger, pisando lo que está.

```
dist\public_html\
├── index.html      ← reemplaza
├── assets\         ← reemplaza
├── .htaccess       ← reemplaza
└── api-php\        ← reemplaza (el .env ya tiene las credenciales)
```

**La base ya está migrada.** Se aplicó desde acá el 14/08/2026. Si igual querés
verificar, entrá por SSH y corré:

```bash
cd public_html/api-php && php migrate.php --estado
```

Tiene que decir "Todo al día".

---

## Lo más importante de esta versión

### El motor de descuentos existe pero está APAGADO, y es a propósito

V002 dejó cargados los descuentos por familia (Bulonería 25%, Tolsen 55%+18%,
Mechas 55%+18%, Electrodos 0%) y por condición de pago. Nadie los usaba: el
precio se seguía calculando con el descuento plano del cliente.

Ahora el motor está construido, probado y conectado. Pero al revisar los datos
apareció un problema que no es técnico sino comercial:

| Familia | Descuento que **ya trae** el precio de granel | Lo que dice la config |
|---|---|---|
| Tolsen | 0% | 55% + 18% = 63,1% |
| Electrodos | 0% | 0% ✓ |
| Bulonería | 50% | 25% |
| Mechas | 70,11% | 63,1% |

Los precios de granel cargados ya tienen descuentos adentro, distintos por
familia, y no coinciden con lo configurado. Aplicar la config encima de esos
precios dejaría Bulonería al 37,5% del precio de lista y Mechas al 11%.

Por eso el motor calcula sobre **precio de lista**, y arranca apagado. Si se
enciende, los precios quedan así respecto de hoy:

- Bulonería **+50%**
- Tolsen **−63,1%**
- Mechas **+23,5%**
- Electrodos sin cambios

Se enciende desde **Configuraciones → Motor de descuentos**, que muestra esa
misma advertencia. Los pedidos ya emitidos no se tocan nunca: cada renglón
guarda el desglose con el que se hizo.

**Esto lo tiene que decidir alguien de comercial, no el sistema.**

---

## Qué cambió

### 1. Descuentos encadenados, no sumados
55% + 18% da 63,1%, no 73%. La cadena es:

```
precio de lista → dto. familia 1 → dto. familia 2 → dto. pago 1 → dto. pago 2 → dto. cliente
```

Todo se calcula y valida en el backend. El frontend no decide precios.

### 2. La proforma ya no le miente al cliente
Este era un bug real de V003. Cuando el depósito marcaba un producto sin stock,
la proforma **lo seguía listando y sumando a precio lleno**, mientras el total
venía del backend que sí lo excluía. En un pedido de prueba eso eran **$1.012,40**
de un producto que nunca se iba a entregar.

Ahora la proforma y la pantalla de confirmación:
- no listan lo que no hay stock (lo informan aparte, sin cobrarlo)
- usan la cantidad confirmada, no la pedida
- muestran el desglose: precio de lista, descuentos aplicados, precio neto
- avisan cuando se entrega menos de lo pedido ("se pidieron 20")

### 3. Nota de pedido para el depósito, sin precios
Botón **Nota de depósito** en cada pedido de Aprobaciones. Genera una hoja por
depósito, con código, descripción, medida y cantidad. Sin un solo monto.
Trae casillero para tildar a mano y renglones para firma. Lista para imprimir.

### 4. Pedido directo
Al cargar un pedido se puede marcar **Pedido directo**: el cliente ya lo
confirmó, así que no se le manda link. Cuando todos los depósitos aprueban,
queda confirmado directamente en vez de esperar.

### 5. Condición de pago
Contado / 30 días / 60 días, se elige al cargar el pedido y define el descuento
por pago. Queda guardada y se muestra en la proforma.

### 6. Historial de auditoría
Botón **Historial** en cada pedido. Registra quién hizo qué y cuándo: creación,
confirmación de stock, faltantes y reemplazos, aprobación de cada depósito,
cambios de estado y envío al cliente.

---

## Arreglos que venían de antes

- **`migrate.php` estaba roto.** Buscaba los `.sql` en `api-php/db/`, un
  directorio que no existía (estaban en `server/db/`). Fallaba en cualquier
  instalación limpia. Ahora es un runner que aplica las migraciones en orden y
  las anota en la tabla `migraciones`, así correrlo dos veces no rompe nada.

- **`schema.sql` estaba desactualizado.** No tenía la tabla `configuraciones`
  de V002 ni las columnas de V003. Levantar el proyecto desde cero daba una base
  incompleta. Se reemplazó por la cadena de migraciones `001` a `005`.

- **Los `.env` con BOM.** El `.env` de producción arranca con un BOM UTF-8 y
  `cargarEnv()` no lo limpiaba, así que la primera clave (`DB_HOST`) quedaba
  ilegible y se usaba el valor por defecto. Ya se contempla.

- **El entorno de desarrollo no arrancaba.** El servidor Node de `server/` quedó
  en V001 y le faltan V002 y V003 enteras, pero `npm run dev` lo levantaba igual.
  Ahora `npm run dev` levanta la API PHP real en :8899, que es a donde Vite
  proxea. El Node viejo quedó como `npm run dev:server-legacy`.

---

## Comandos

```bash
npm run dev            # API PHP en :8899 + Vite en :5173
npm run migrate        # aplica migraciones pendientes
npm run test:precios   # 27 verificaciones del motor de descuentos
```

Necesita PHP. Si no está: `winget install PHP.PHP.8.4`, y habilitar
`extension=pdo_mysql` en el `php.ini`.

---

## Detalle técnico

**Migraciones nuevas** (`api-php/db/`):
- `004-motor-descuentos.sql` — desglose por renglón, `condicionPago`,
  `tipoOrigen`, tabla `pedidos_log`, interruptor `motor_descuentos`
- `005-backfill-desglose.sql` — completa el desglose de los 7 pedidos que ya
  existían, preservando sus totales al centavo

**Columnas nuevas en `aprobaciones_items`:** `precioLista`, `descFamilia1`,
`descFamilia2`, `descPago1`, `descPago2`, `descCliente`, `precioNeto`.

**Endpoint nuevo:** `GET /api/aprobaciones/:id/log`

**Archivo nuevo:** `api-php/lib/precios.php` — el motor, sin dependencias de BD
en sus funciones de cálculo, con 27 tests.

---

## Rollback

El código anterior está en el commit anterior a este. Las columnas nuevas
tienen DEFAULT y no molestan si se vuelve atrás.

Lo único que hay que saber: `recalcularTotal()` ahora suma `precioNeto` en vez
de aplicar el descuento al final. Si se revierte el código sin revertir la base,
los totales se recalculan igual porque `precioNeto` quedó cargado con el valor
correcto en cada renglón.
