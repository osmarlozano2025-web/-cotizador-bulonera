# V003 — Electrodos, Depósitos y Reemplazo por falta de stock

## Para subir

Todo lo que hay en `dist\public_html\` va a `public_html` de Hostinger.
Se pisan los archivos que ya están. **La base de datos ya está lista, no hay que correr nada.**

```
dist\public_html\
├── index.html      ← reemplaza
├── assets\         ← reemplaza
├── .htaccess       ← reemplaza
└── api-php\        ← reemplaza (el .env ya tiene las credenciales correctas)
```

Entrás con **admin1234 / admin1234**.

---

## Qué cambió

### 1. Cuarta familia: Electrodos
Los 21 electrodos estaban mal clasificados dentro de Bulonería. Ahora tienen su propia
familia y su propio depósito.

| Depósito | Familia | Productos |
|---|---|---|
| 1 | Bulonería | 2700 |
| 2 | Tolsen | 1792 |
| 3 | Mechas | 211 |
| 4 | Electrodos | 21 |

Las "PINZA PORTA ELECTRODOS" quedaron en Tolsen porque son herramientas, no electrodos.

### 2. El pedido se separa por familia mientras se carga
En **Nuevo Pedido** los productos se agrupan solos por depósito a medida que los agregás,
con subtotal por grupo. Así ves cómo va a quedar dividido antes de mandarlo a aprobación.

### 3. Depósitos con responsable (Configuraciones)
En **Configuraciones → Depósitos y responsables** asignás a cada depósito una persona
de las cargadas en Personal.

Ese responsable, cuando entra a Aprobaciones, **sólo ve los pedidos y productos de su
depósito**. No ve lo de los otros. Los administradores siguen viendo todo.

Si un depósito queda sin responsable asignado, lo sigue viendo cualquiera con permiso
de aprobar (igual que antes).

### 4. Revisión de stock producto por producto
En cada producto el depósito ahora elige:

- **Hay stock** → queda confirmado en verde.
- **Sin stock** → se abre un buscador acotado a esa familia para elegir el producto
  similar que sí tiene. El producto original **queda tachado y marcado "Sin stock"**, y el
  reemplazo se agrega debajo marcado en verde como "Reemplazo".
  También se puede marcar sin stock sin elegir reemplazo.

**El botón "Aprobar depósito" queda deshabilitado hasta que no quede ningún producto sin
revisar.** Muestra cuántos faltan.

El total del pedido se recalcula solo: lo que quedó sin stock no suma, y el reemplazo sí.

---

## Detalle técnico

**Base de datos** (ya aplicado en producción):
- `productos.familia` → 21 filas movidas a `electrodos`
- `aprobaciones_items` → columnas nuevas: `estado`, `reemplazaA`, `nota`, `cantidadConfirmada`
- `configuraciones` → 4 filas nuevas tipo `deposito` con `{numero, familia, nombre, responsableId}`

**Endpoints nuevos:**
- `POST /api/aprobaciones/:id/items/:itemId/confirmar`
- `POST /api/aprobaciones/:id/items/:itemId/sin-stock`

Ambos validan que el usuario sea responsable de ese depósito y que el depósito no esté
ya aprobado.

**Estados de un item:** `pendiente` → `confirmado` | `sin_stock`, más `reemplazo` para los
que se agregan como sustituto.

---

## Corregido de paso

Al agregar la sección Configuraciones en V002 se habían borrado sin querer los permisos
`puedeAprobarFamilias` y `puedeEnviarCliente` de los administradores — por eso `admin` y
`Mgonzalez` no veían los botones de aprobar. Ya está reparado para los 5 usuarios.

---

## Rollback

```
git checkout v2.2-checkpoint-configuraciones
```

Las columnas nuevas de la BD no molestan si se vuelve atrás (tienen default).
Para revertir la familia de electrodos:

```sql
UPDATE productos SET familia='buloneria' WHERE familia='electrodos';
```
