# 🚀 DESPLIEGUE V002 A HOSTINGER - GUÍA PASO A PASO

**Versión:** v2.2-checkpoint-configuraciones  
**Fecha:** 2026-08-13  
**Tiempo estimado:** 15 minutos

---

## ✅ CHECKLIST PRE-DESPLIEGUE

- [ ] Tener FileZilla o Hostinger File Manager abierto
- [ ] Credenciales FTP de Hostinger a mano
- [ ] Acceso a cPanel/hPanel de Hostinger
- [ ] URL de prueba lista: https://bulonera.nazarenolozano.de

---

## 📋 PASO 1: PREPARAR ARCHIVOS LOCALES

En tu máquina local, asegúrate que existan:

```
cotizador-app/
├── client/dist/           ✅ Compilado (npm run build ya lo hizo)
├── api-php/               ✅ Backend completo
│   ├── index.php
│   ├── migrate.php        ← NUEVO
│   ├── config.php
│   ├── .env
│   ├── .htaccess
│   ├── lib/
│   ├── routes/
│   │   └── configuraciones.php  ← NUEVO
│   └── db/
│       └── 002-configuraciones.sql  ← NUEVO
└── deploy-htaccess-raiz.txt
```

Si no has hecho `npm run build` en `client/`:
```bash
cd client
npm run build
```

---

## 🔌 PASO 2: CONECTAR FTP A HOSTINGER

### Opción A: FileZilla (recomendado)

1. **Abre FileZilla**
2. **Menú → File → Site Manager**
3. **New site** con:
   ```
   Host:     bulonera.nazarenolozano.de  (o tu FTP host)
   Port:     21
   Protocol: FTP
   User:     [tu usuario FTP]
   Password: [tu contraseña FTP]
   ```
4. **Connect**

### Opción B: Hostinger File Manager

1. Abre hPanel de Hostinger
2. **Archivos → Administrador de archivos**
3. Navega a `public_html`

---

## 📤 PASO 3: SUBIR ARCHIVOS

### 3.1 - Subir contenido de `client/dist/`

**En FileZilla:**
1. Lado izquierdo (local): navega a `cotizador-app/client/dist/`
2. Lado derecho (remoto): asegúrate estar en `public_html/`
3. Selecciona TODO en `dist/`:
   - `index.html`
   - `assets/` (carpeta completa)
4. **Drag & drop** al lado derecho (remoto)
5. Espera a que termine

**Resultado en Hostinger:**
```
public_html/
├── index.html              ✅
├── assets/
│   ├── index-*.js
│   └── index-*.css
```

### 3.2 - Subir `.htaccess`

1. En FileZilla, lado izquierdo (local): `deploy-htaccess-raiz.txt`
2. Lado derecho: `public_html/`
3. **Renombrar después** de subir: `.htaccess` (quitar `deploy-`)
   - Click derecho en archivo → Rename
   - Cambiar a `.htaccess`

**Resultado:**
```
public_html/
├── .htaccess               ✅
```

### 3.3 - Subir carpeta `api-php/`

1. Lado izquierdo: `cotizador-app/api-php/` (carpeta completa)
2. Lado derecho: `public_html/`
3. **Drag & drop** la carpeta completa

**Resultado en Hostinger:**
```
public_html/
├── api-php/                ✅
│   ├── index.php
│   ├── migrate.php         ← NUEVO
│   ├── config.php
│   ├── .env
│   ├── .htaccess
│   ├── lib/
│   ├── routes/
│   │   ├── auth.php
│   │   ├── personal.php
│   │   ├── clientes.php
│   │   ├── productos.php
│   │   ├── aprobaciones.php
│   │   ├── integraciones.php
│   │   └── configuraciones.php  ← NUEVO
│   └── db/
│       ├── schema.sql
│       └── 002-configuraciones.sql  ← NUEVO
```

---

## 🗄️ PASO 4: APLICAR MIGRACIÓN DE BD

**En Hostinger hPanel:**

1. Abre **cPanel** (o Terminal en hPanel)
2. Busca **Terminal** (o SSH)
3. Ejecuta:
   ```bash
   cd public_html/api-php
   php migrate.php
   ```

**Output esperado:**
```
🔄 Verificando tabla configuraciones...
📝 Creando tabla configuraciones...
✅ Tabla configuraciones creada exitosamente
✅ Datos iniciales insertados
✅ Migración completada exitosamente
```

**Si sale error:**
- Verifica que `api-php/.env` tiene credenciales BD correctas
- Verifica permisos de archivo: `chmod 755 migrate.php`

---

## ✅ PASO 5: VERIFICAR EN PRODUCCIÓN

### 5.1 - Test rápido

Abre navegador:
```
https://bulonera.nazarenolozano.de
```

Deberías ver el login.

### 5.2 - Loguear y testear

1. **Usuario:** `admin`
2. **Contraseña:** `cordoba2026`
3. **Debería:**
   - Loguear sin errores
   - Redirigir a "Nuevo Pedido"
   - Sidebar mostrar todas las secciones

### 5.3 - Test del módulo de Configuraciones

1. Sidebar → **⚙️ Configuraciones**
2. Debería mostrar:
   - Descuentos por Familia
   - Descuentos por Pago
   - Stock y Caché
3. Click **✏️ Editar** en Tolsen
4. Cambiar `55` a `60`
5. Click **✅ Guardar**
6. Debería mostrar mensaje verde ✅
7. Recarga página: cambio debería persistir

---

## 🚨 TROUBLESHOOTING

### "Error 500 en /api/configuraciones"
- [ ] Verificar `api-php/.env` existe y tiene credenciales correctas
- [ ] Verificar `php migrate.php` ejecutó sin errores
- [ ] Ver logs en hPanel → Error Logs

### "Tabla configuraciones no existe"
- [ ] Ejecutar nuevamente: `php migrate.php`
- [ ] Verificar permisos en hPanel → MySQL

### "Configuraciones no aparece en sidebar"
- [ ] Usuario debe ser `Administrador`
- [ ] Limpiar localStorage: abre DevTools (F12) → Console:
  ```javascript
  localStorage.clear()
  ```
- [ ] Refrescar página

### "Botones no funcionan"
- [ ] Verificar que JS se está cargando: DevTools → Console (no debe haber errores)
- [ ] Verificar que API responde: 
  ```
  https://bulonera.nazarenolozano.de/api/configuraciones
  ```
  Debería retornar JSON

---

## 📊 VERIFICAR QUE TODO FUNCIONA

Checklist final:

- [ ] App carga en https://bulonera.nazarenolozano.de ✅
- [ ] Login funciona (admin/cordoba2026) ✅
- [ ] Sidebar muestra ⚙️ Configuraciones ✅
- [ ] Puedo entrar a Configuraciones ✅
- [ ] Puedo hacer click en ✏️ Editar ✅
- [ ] Puedo cambiar % y guardar ✅
- [ ] Cambios persisten después de recargar ✅
- [ ] No hay errores en Console (F12) ✅

---

## 🎉 ÉXITO = V002 LIVE

Si todo ✅, entonces:

```bash
git tag v2.2-configuraciones-live
git push origin v2.2-configuraciones-live
```

---

## 📞 SOPORTE

Si algo falla:
1. Copia el error exacto
2. Revisa Console (F12)
3. Checkea hPanel → Error Logs
4. Contacta soporte Hostinger si es problema de BD/PHP

---

**¡Listo para desplegar!** 🚀
