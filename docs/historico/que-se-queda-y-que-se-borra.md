# Qué se queda y qué se puede borrar

Relevado el 8/9/2026 sobre la carpeta del cliente.

La app en producción es **PHP + MySQL**: el backend está en `api-php/` y el
frontend se compila desde `client/src/`. Todo lo demás es historia del
proyecto, material de referencia o cosas que se regeneran solas.

---

## 1. Imprescindible — si se borra, se rompe

### `Proyecto principal/cotizador-app/`

| Qué | Por qué |
|---|---|
| `api-php/` | El backend que corre en Hostinger: rutas, motor de precios, lector de pedidos y migraciones. |
| `client/src/` | El código de todas las pantallas. |
| `client/index.html`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `package.json` | Sin esto no se puede compilar el frontend. |
| `client/public/` | El fondo de bulones y demás archivos estáticos. |
| `package.json`, `iniciar-dev.cmd` | Los comandos: `npm run dev`, `migrate`, `test:precios`, `test:busqueda`. |
| `README.md`, `.gitignore` | Documentación y las reglas que mantienen las credenciales fuera del repo. |

### `server/` — sólo estos archivos

| Archivo | Para qué |
|---|---|
| `deploy-hostinger.mjs` | Sube la app por FTP. Lee la clave de una variable de entorno. |
| `importar-productos.mjs` | Recarga el catálogo desde el Excel de listas. |
| `importar-clientes.mjs` | Recarga los clientes con sus seis descuentos. |
| `dev-api.mjs`, `dev-php.mjs`, `buscar-php.mjs` | Levantan PHP en local y corren scripts sueltos. |
| `check-php-funcs.mjs` | Avisa si se llama una función PHP que no existe. |
| `package.json` | Declara `xlsx` y `mysql2`, que usan los importadores. |

### En la raíz del proyecto

| Qué | Por qué |
|---|---|
| `respaldos/` (1,6 MB) | Los volcados de productos, clientes y pedidos de antes de reemplazar las bases. Es la única forma de volver atrás. |
| `docs/` | Análisis de requisitos, plan de trabajo y el historial de versiones. |
| `.gitignore`, `AGENTS.md`, `LEEME.md` | Reglas del repo y notas del proyecto. |
| `.claude/` | Configuración de la sesión de trabajo. |
| `PARA-SUBIR/LEEME.md` | Instrucciones de despliegue. |

---

## 2. Se regenera — borralo tranquilo, vuelve con un comando

| Qué | Tamaño | Cómo vuelve |
|---|---|---|
| `node_modules/` (las tres) | **196 MB** | `npm install` en la raíz, en `client/` y en `server/` |
| `client/dist/` | ~1 MB | `npm run build` |
| `PARA-SUBIR/dist/` | 904 KB | Se rearma al desplegar |

**196 MB que se recuperan solos.** Si el proyecto queda quieto un tiempo, esto
es lo primero que conviene sacar.

---

## 3. Borrable — no lo usa nada

| Qué | Tamaño | Por qué se puede ir |
|---|---|---|
| `Proyecto principal/app-tickets-1-appsheetmp4.mp4` | **804 MB** | Grabación de pantalla. |
| `Proyecto principal/Grabación 2026-08-11.mp4` | **604 MB** | Ídem. Ya estaba excluida del repo por superar el límite de GitHub. |
| `referencia-erp-supabase/` | **66 MB** | Un ERP paralelo hecho con Supabase, que se usó como referencia. Verificado: la app no lo importa en ningún lado. |
| `Proyecto sebas bulonera/` | 0 | Carpeta vacía. |
| `.Codex/` | mínimo | Restos de otra herramienta, de julio. |
| `cotizador-app/cotizadores/` | 2,1 MB | Los Excel originales de cotización. Todo eso ya está en la base de datos. |
| `cotizador-app/deploy-htaccess-raiz.txt` | mínimo | El `.htaccess` ya viaja dentro del paquete de despliegue. |

### Del `server/`, lo que quedó del servidor Node viejo

`index.js`, `routes/`, `services/`, `utils/`, `data/` (1,6 MB), `db/`,
`scripts/`, `config.json`, `lint-php.mjs`

Ese servidor se quedó en la primera versión: **no tiene nada de V002 en
adelante** — ni configuraciones, ni depósitos, ni motor de descuentos, ni el
lector de pedidos. Hoy el backend es PHP y esos archivos no los llama nadie.
`server/data/` son los JSON de cuando los datos vivían en archivos, antes de
MySQL.

Si se borran, hay que sacar del `package.json` las dos líneas que los
mencionan: `"dev:server-legacy"` y `"start"`.

---

## Resumen

| | Espacio |
|---|---|
| Borrable de una | **~1,5 GB** |
| Se regenera con `npm install` | 196 MB |
| **Hay que conservar** | **~15 MB** |

Todo el proyecto que importa entra en 15 MB: el código, los respaldos y la
documentación.

---

## Antes de borrar

1. **Confirmá que está todo en GitHub.** El repo es
   `osmarlozano2025-web/-cotizador-bulonera`. Si `git status` sale limpio y no
   hay commits sin subir, el código está a salvo aunque se borre la carpeta.
2. **`respaldos/` NO está en GitHub** — está excluido a propósito, porque tiene
   datos de clientes. Si borrás esa carpeta, se pierde la única copia de las
   bases anteriores. Guardala en otro lado antes.
3. Los videos tampoco están en el repo. Si te sirven, moverlos afuera; si no,
   son 1,4 GB que no vuelven.
