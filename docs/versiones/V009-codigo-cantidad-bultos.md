# V009 — Código de producto, cantidad enviada y bultos

## Para subir

Todo lo que está en `dist\public_html\` va a `public_html` de Hostinger, pisando lo
que hay. **La base de datos ya está aplicada, no hay que correr nada.**

El `.env` ya va con las credenciales correctas.

---

## Qué cambió

Cierra tres pendientes del feedback del cliente. Elegí estos tres porque son los
únicos que no dependían de ninguna definición de nadie.

### 1. Código de producto en todas las vistas — punto 2.1 ✅ cerrado

Faltaba en dos de las nueve pantallas: la **confirmación del cliente** y el
**resultado de la foto leída por IA**. En las otras siete ya estaba.

El código va en tipografía monoespaciada con los dígitos alineados, porque el
depósito lo lee para ubicar el artículo en la estantería — no es texto para leer
corrido.

### 2. Cantidad enviada editable — mitad del punto 1.3

El servidor ya aceptaba confirmar menos de lo pedido desde V003, pero la pantalla
no dejaba escribirlo: el depósito solo podía confirmar todo o marcar sin stock.

Ahora hay un campo al lado del botón:

- Arranca en la cantidad pedida, que es el caso normal.
- Si se baja el número, el botón cambia a **"Enviar 80"** y el campo se pone en
  ámbar. La entrega parcial se ve **antes** de confirmar, no después.
- No se puede poner 0 — para eso está el botón de sin stock, que además permite
  elegir un reemplazo. Tampoco se puede poner más de lo pedido.

Lo pedido y lo enviado quedan guardados por separado, así que la trazabilidad no
se pierde: la proforma muestra "se pidieron 100" al lado de los 80 que van.

### 3. Bultos — punto 2.2 ✅ cerrado

Campo nuevo en la tarjeta del pedido, en Aprobaciones. Se escribe el número y se
guarda solo al salir del campo o con Enter.

Decisiones que tomé y conviene que sepas:

- **Va en el pedido, no en cada depósito.** El bulto es lo que sale en el camión
  hacia el cliente; si mañana quieren despachar por depósito separado, se agrega
  ahí también.
- **Vacío no es cero.** Vacío significa "todavía no se contaron"; 0 significaría
  "no se despachó nada". Son cosas distintas y el sistema las distingue.
- **Se congelan al confirmar el pedido**, porque para entonces el remito ya salió.
- **Se imprimen en la nota de depósito.** Si todavía no se contaron, sale una
  línea en blanco para anotarlos a mano.

---

## Para probarlo

1. Entrás como `admin1234` y vas a Aprobaciones.
2. En un pedido pendiente, bajá la cantidad de un producto (por ejemplo de 100 a
   80) y confirmá. Tiene que quedar "80× ... (se pidieron 100)".
3. Cargá 3 en el campo Bultos de arriba. Tiene que decir "Guardado".
4. Abrí la Nota de depósito: tiene que mostrar los 3 bultos y las cantidades
   corregidas.
5. Abrí el link de confirmación del cliente: los productos ahora llevan el código
   adelante de la descripción.

---

## Qué queda pendiente de la lista del cliente

| Punto | Estado |
|---|---|
| 1.1 Dos depósitos | Esperando confirmación de si Electrodos y Mechas van al 1 |
| 1.2 Granel y fracción | Los datos están cargados; falta que el sistema los use |
| 1.3 Ajuste de cantidades | **Mitad hecha.** La otra mitad es Tango, que sigue frenado |
| 1.4 Alerta roja sin stock | Cerrado en V003 |
| 1.5 Depurar máster | Falta que definan qué significa |
| 2.1 Código de producto | **Cerrado acá** |
| 2.2 Bultos y cantidad real | **Cerrado acá** |
| 2.3 Guías de despacho | Se puede hacer; falta definir qué lleva |
| 3.1 Ocultar precios afuera | En pausa por pedido tuyo |
| 3.2 Los tres bugs | Faltan las fotos y la pantalla del error |

El plan completo está en `PLAN-DE-TRABAJO.html`, en la carpeta del cliente.

---

## Rollback

```
git checkout v3.0-electrodos-depositos
```

La columna `bultos` no molesta si se vuelve atrás: es opcional y el código viejo
la ignora.
