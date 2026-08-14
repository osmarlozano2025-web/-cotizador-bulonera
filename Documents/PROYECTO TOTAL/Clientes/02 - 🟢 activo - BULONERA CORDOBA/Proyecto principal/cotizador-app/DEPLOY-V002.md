# 🚀 Despliegue V002 - Módulo de Configuraciones

## ✅ Checklist de Despliegue

### 1️⃣ **Descargar archivos compilados**
```bash
# Los archivos a desplegar están listos en:
- client/dist/        → HTML + CSS + JS compilado
- api-php/            → Backend PHP (completo)
```

### 2️⃣ **Subir vía FTP a Hostinger**

**Estructura:**
```
bulonera.nazarenolozano.de (public_html)
├── index.html                 ← De dist/
├── assets/                    ← De dist/assets/
├── .htaccess                  ← deploy-htaccess-raiz.txt
└── api-php/                   ← TODO el contenido de api-php/
    ├── index.php
    ├── migrate.php            ← NUEVO (migración)
    ├── routes/configuraciones.php  ← NUEVO
    ├── config.php
    ├── .env
    └── ... (resto)
```

### 3️⃣ **Aplicar Migración de BD en Hostinger**

**Via hPanel → cPanel → Terminal:**
```bash
cd public_html/api-php
php migrate.php
```

**Output esperado:**
```
🔄 Verificando tabla configuraciones...
📝 Creando tabla configuraciones...
✅ Tabla configuraciones creada exitosamente
✅ Migración completada exitosamente
```

Si ya existe, reemplazará datos con `ON DUPLICATE KEY UPDATE`.

### 4️⃣ **Verificar en Hostinger**

**Test 1: API pública (caché)**
```bash
curl https://bulonera.nazarenolozano.de/api/configuraciones

# Debe retornar JSON:
{
  "descuentos_familia": {
    "buloneria": {"desc_1": 25, "desc_2": 0},
    "tolsen": {"desc_1": 55, "desc_2": 18},
    ...
  },
  ...
}
```

**Test 2: UI Admin**
1. Loguear como admin
2. Sidebar → Configuraciones → Configuraciones
3. Ver sección "⚙️ Configuraciones Generales"
4. Editar un % de descuento
5. Guardar → ✅ OK

### 5️⃣ **Rollback (si algo falla)**

Si necesitas volver a V001:
```bash
# En tu máquina local:
git reset --hard v2.1-checkpoint-base
npm run build  # en client/
# Volver a subir dist/ + api-php/ a Hostinger
# Ejecutar: php api-php/migrate.php (es idempotente)
```

---

## 📊 Qué cambió en V002

| Componente | Cambio |
|:-----------|:-------|
| **Base de datos** | ✨ Nueva tabla `configuraciones` con 9 registros |
| **Backend** | ✨ Nuevas rutas GET/PUT `/api/configuraciones` |
| **Frontend** | ✨ Nueva página Configuraciones.jsx (admin-only) |
| **UI** | ✨ Nuevo menú "⚙️ Configuraciones" en sidebar |
| **Seguridad** | ✅ Solo Administrador puede editar |
| **Caché** | ✅ 5 min TTL en backend, no requiere redeploy |

---

## 🔧 Configuraciones Disponibles

Editable desde UI (no código):

### 📦 Descuentos por Familia
- **Bulonería:** 25% + 0% (directo)
- **Tolsen:** 55% + 18% (encadenado)
- **Mechas:** 55% + 18% (encadenado)
- **Electrodos:** 0% + 0% (precio neto)

### 💳 Descuentos por Pago
- **Contado:** 0% + 0%
- **30 días:** 5% + 0%
- **60 días:** 0% + 0%

### ⚡ Stock y Caché
- Tiempo de reserva: 30 minutos
- TTL caché stock: 300 segundos (5 min)

---

## 📝 Notas

✅ **Seguro:** Cambios en BD, no en código → sin builds
✅ **Auditado:** Se registra quién cambió qué y cuándo
✅ **Rápido:** Caché TTL 5 min → cambios visibles en ~5 seg
✅ **Extensible:** Agregar más configuraciones sin código

---

## 🚨 Troubleshooting

**P: "Error 500 al cargar /configuraciones"**
- ✅ Verificar que `php migrate.php` corrió sin errores
- ✅ Ver permisos en `api-php/routes/configuraciones.php`

**P: "Configuraciones no aparecen en sidebar"**
- ✅ Verificar que usuario logueado es Administrador
- ✅ Limpiar localStorage: `localStorage.clear()` en DevTools

**P: "Cambios no se guardan"**
- ✅ Verificar que token JWT es válido (no expiró)
- ✅ Verificar que usuario tiene rol `Administrador`

---

## ✅ V002 Completo y Listo para Producción

**Próximo paso:** Cuando confirmes que funciona en producción, crearemos V003 con...?
