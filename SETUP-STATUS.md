# Status Setup - Córdoba Bulonera - 8 Sep 2026

## ✅ Lo que hice

### 1. **Reorganicé la carpeta completa**
- ✅ Clonué el código desde GitHub
- ✅ Extraje la app de la carpeta anidada → `app/` (en la raíz)
- ✅ Moví documentación → `docs/`
- ✅ Organizé config de Claude → `.claude/`
- ✅ Respaldos en `respaldos/` (exclusivo del repo)

### 2. **Recreé los archivos `.env`**
Ambos con tus credenciales, listos para conectar:
- ✅ `app/api-php/.env` — Backend PHP
- ✅ `app/server/.env` — Importadores & herramientas

### 3. **Organicé los respaldos**
- ✅ Documentos críticos → `docs/documentos-fuera-del-repo/`
- ✅ Respaldos SQL (5.007 filas) → `docs/respaldos-db/`
- ✅ Credenciales seguras en `respaldos/credenciales.txt`

---

## 🚀 Próximos pasos para empezar a trabajar

### **Paso 1: Instalar dependencias** (15 min)
```bash
cd app
npm install
npm install --prefix client
npm install --prefix server
```

### **Paso 2: Verificar conexión a BD** (2 min)
```bash
npm run migrate -- --estado
```
Tiene que decir: **"Todo al día"**

Si falla, revisá que:
- `app/api-php/.env` existe
- Tenés conexión de internet (la BD está en Hostinger)

### **Paso 3: Levantar el entorno** (5 min)
```bash
npm run dev
```
Arranca dos cosas:
- API PHP en http://localhost:8899
- Frontend React en http://localhost:5173

Abrí `http://localhost:5173` en el navegador.

### **Paso 4: Tests rápidos** (2 min)
```bash
npm run test:precios     # Motor de precios (53 tests)
```

---

## 📁 Estructura nueva (limpia)

```
Buloneroa Cordoba Final/
├── app/                          # ← El proyecto (raíz limpia)
│   ├── api-php/                  # Backend PHP sin framework
│   ├── client/                   # Frontend React + Vite
│   ├── server/                   # Tools: deploy, importadores
│   ├── api-php/.env              # BD + OpenAI (creado ✅)
│   └── server/.env               # BD + OpenAI (creado ✅)
│
├── docs/                         # Documentación
│   ├── documentos-fuera-del-repo/
│   │   ├── LEEME.md
│   │   ├── plan-de-trabajo.html
│   │   └── estado-requerimientos.html
│   └── respaldos-db/
│       ├── 20260831-133826-productos.sql
│       ├── 20260831-133826-clientes.sql
│       ├── 20260831-133826-aprobaciones.sql
│       └── (más tablas...)
│
├── respaldos/                    # NO VA A GITHUB
│   ├── credenciales.txt          # .env de emergencia
│   └── ...
│
└── .claude/                      # Config de Claude Code
```

---

## 🔐 Credenciales (guardadas seguras)

| Qué | Dónde | Estado |
|-----|-------|--------|
| Base Datos | `app/api-php/.env` | ✅ Configurada |
| OpenAI API | `app/api-php/.env` + `app/server/.env` | ✅ Configurada |
| FTP Hostinger | `respaldos/credenciales.txt` | 📋 Nota abajo |

**Nota FTP:** La clave NO se guarda en archivos del proyecto. Se pasa al desplegar:
```bash
FTP_PASSWORD='tu-clave' node server/deploy-hostinger.mjs ...
```

---

## 📝 Lo que sigue (cambios grandes)

Tenés un montón de cambios por hacer. Cuando arranques a trabajar, acordate:

1. **Verificá primero que levante** (npm run dev)
2. **Hacé cambios en `app/`**, no en la carpeta vieja
3. **Consultá `docs/plan-de-trabajo.html`** para ver qué partes están sin proteger
4. **Cada cambio importante → un commit** (git está limpio)

---

## 🛟 Si algo falla

### "No conecta a la base"
→ Revisá `app/api-php/.env` y `app/server/.env`  
→ Verificá internet (BD está en Hostinger)

### "Error de módulo en npm install"
→ Borrá `package-lock.json` y `node_modules/`
→ Volvé a hacer `npm install`

### "PHP no encontrado"
→ Necesitás **PHP 8.1+** instalado  
→ En Windows: `winget install PHP.PHP.8.4`  
→ Ver `docs/documentos-fuera-del-repo/LEEME.md`

---

## ✨ Estado final

| Aspecto | Status |
|---------|--------|
| Código actualizado | ✅ GitHub → app/ |
| .env files | ✅ Listos para conectar |
| Documentación | ✅ Organizada en docs/ |
| Respaldos DB | ✅ Seguros en docs/respaldos-db/ |
| Credenciales | ✅ En respaldos/ (no versionado) |
| Listo para trabajar | ⏳ Tras instalar dependencias |

---

Cuando termines los pasos 1-3, avísame y empezamos con los cambios grandes que tenés en mente. 🚀
