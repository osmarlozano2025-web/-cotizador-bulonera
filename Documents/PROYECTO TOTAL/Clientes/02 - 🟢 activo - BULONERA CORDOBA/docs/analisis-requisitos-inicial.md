# 📋 ANÁLISIS DE REQUISITOS - Bulonera Córdoba

## Executive Summary (TL;DR)

**Documento:** DEVOLUCION – DEMO - PEDIDOS 13.08.2026  
**Complejidad:** 🔴 **ALTA** – Requiere cambios arquitectónicos significativos  
**Timeline realista:** 3-4 sprints (8-12 semanas) para todo, o MVP en 2 sprints  
**Prioridad recomendada:** Fase 1 (MVP) + Fase 2 (Escalable)

---

## 📊 DESGLOSE POR REQUERIMIENTO

### 1️⃣ INTEGRACIÓN CON TANGO ERP (🔴 BLOQUEANTE)

#### ¿Qué implica?
- Vincular BD local con API/DB de Tango (consultas AFIP, stock, catálogo de productos)
- Bidireccionalidad: crear clientes en Tango desde la app
- Mapeo de códigos de productos (ej: "12345" ↔ "TOL12345")
- Consultas de stock en tiempo real

#### Impacto en el proyecto
```
ACTUALMENTE: App ↔ MySQL local (sistema aislado)
REQUERIDO:   App ↔ MySQL local ↔ API Tango ↔ AFIP
             (+ caché de stock, reintentos, sincronización)
```

#### Riesgos de Seguridad 🔒
| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| Exposición de credenciales Tango | 🔴 CRÍTICA | Env vars + encriptación en BD |
| MITM en comunicación Tango (HTTP) | 🔴 CRÍTICA | Forzar HTTPS solo |
| Inyección SQL en búsqueda de clientes AFIP | 🟠 ALTA | Prepared statements (ya lo hacemos) |
| Sincronización fallida silenciosa | 🟠 ALTA | Logs + alertas de desincronización |
| Raza de datos (crear en Tango pero fallar en local) | 🟡 MEDIA | Transacción distribuida o retry logic |

#### ¿Se puede hacer ahora?
- ✅ **Parcialmente**: Backend + abstracción de API lista en 1-2 semanas
- ❌ **No 100%**: Necesitamos credenciales reales + sandbox de Tango
- ❌ **No sin riesgo**: Sin encriptación de credenciales en BD

#### Recomendación
**POSTERGAR hasta tener:**
1. Credenciales de Tango + documentación oficial de API
2. Ambiente de staging para testear sincronización
3. Sistema de logs + monitoreo de desincronización

**ALTERNATIVA MVP:** Mock de Tango (simular API) para validar flujo, reemplazar después.

---

### 2️⃣ MAPEO DE CÓDIGOS DE PRODUCTOS (🟠 COMPLEJO)

#### ¿Qué implica?
- Tabla de equivalencias: `12345` (interno) ↔ `TOL12345` (Tango)
- Búsqueda difusa debe matchear ambos
- OCR debe interpretar códigos variados

#### Impacto en el proyecto
```
CAMBIOS EN BD:
- Tabla `producto_aliases` (código_original, código_alternativo, fuente)
- Index en ambas columnas para búsqueda rápida

CAMBIOS EN CÓDIGO:
- Router de búsqueda: incluir aliases en Fuse.js
- OCR: post-procesar códigos contra mapeo
- Catálogo: cargar desde Tango con alias automáticos
```

#### Riesgos 🔒
- Ambigüedad: un código cliente coincide con múltiples productos
- Stale data: alias no sincronizado con Tango

#### ¿Se puede hacer ahora?
- ✅ **Sí, 100%**: Tabla + búsqueda mejorada en 1 semana
- ✅ **Incremental**: Empezar manual, auto-sincronizar después

#### Recomendación
**HACER AHORA:**
- Agregar tabla `productos_aliases` con UI para admin
- Extender búsqueda de Fuse.js a incluir aliases
- Testing con casos reales (Tolsen, etc.)

---

### 3️⃣ CONTROL DE STOCK EN TIEMPO REAL (🔴 CRÍTICO)

#### ¿Qué implica?
```
Cotización:   Disponible → Alerta blanda (✅ permite cotizar)
Pedido/Depó:  Disponible → Permite
              Insuficiente → Señala faltante (permite parcial)
              Sin Stock → Alerta crítica (requiere decisión)
```

#### Impacto en el proyecto
```
BACKEND:
- GET /api/productos/:id/stock (llamada a Tango + caché local)
- Caché con TTL (ej: 5 min) para no saturar Tango
- Algoritmo de reserva temporal (cuando se aprueba)

FRONTEND:
- Mostrar estado de stock al cargar producto
- Badge rojo/amarillo/verde
- Tooltip con explicación

BD:
- Tabla `reservas` (pedido_id, producto_id, cantidad, fecha_expiracion)
- Auditoría de cambios de stock
```

#### Riesgos 🔒
- **Race condition**: 2 usuarios añaden mismo producto → stock negativo
  - Mitigación: Lock pessimista (Tango side) o caché distribuida (Redis)
- **Stock no reservado**: Depósito vuela producto pero aparece disponible
  - Mitigación: Reserva temporal al validar pedido (30 min)
- **Datos stale**: Tango cambió stock pero caché vieja
  - Mitigación: TTL corto (2-5 min) o webhook en tiempo real

#### ¿Se puede hacer ahora?
- ⚠️ **Parcialmente**: Backend sí, real-time sincronización NO sin Tango
- ✅ **Mock funcional**: Simular stock localmente para testing

#### Recomendación
**MVMV (Mínima Viabilidad, pero con Validación):**
1. API endpoint `/api/productos/:id/stock` que consulte caché local
2. Validación en BD cuando valida pedido (cantidad ≤ stock - reservas)
3. Lógica de reintento si falla Tango
4. Sincronización nightly (no real-time por ahora)

**DESPUÉS (Con Tango):**
- Webhook de Tango → Redis cache invalidation
- Real-time con WebSocket si es crítico

---

### 4️⃣ MOTOR DE DESCUENTOS COMPLEJOS (🔴 CRÍTICO)

#### ¿Qué implica?
```
Bulonería:    25% o 18% directo
Tolsen:       55% + 18% (encadenado, no 73%)
Mechas:       55% + 18%
Electrodos:   0% (Precio Neto)

Por Pago:     10% o 10% + 10% sobre subtotal

Visualización en PDF:
- Precio lista
- Descuentos por línea
- Descuentos por pago
- Precio neto final (transparente)
```

#### Impacto en el proyecto
```
BD:
- Tabla `descuentos_familia` (familia, tipo_desc, porcentaje_1, porcentaje_2, vigencia)
- Tabla `descuentos_cliente` (cliente_id, familia_id, override_desc, condicion_pago)

BACKEND:
- Calculadora de precios (función pura, testeable)
  calcularPrecioFinal(familia, cantidadComprada, descuentoCliente, condicionPago)
  → { precioLista, desc1, desc2, descPago, precioNeto }

FRONTEND:
- Desglose en cotización (línea por línea)
- Desglose en PDF (tabla con detalle)
```

#### Riesgos 🔒
- **Fraude**: Cliente manipula descuentos en cliente (frontend)
  - Mitigación: Validar/recalcular en backend SIEMPRE
- **Inconsistencia**: Descuentos diferentes según familia confunden al vendedor
  - Mitigación: UI clara + validación de reglas en admin
- **Impuesto**: Descuentos encadenados afectan base imponible
  - Mitigación: Consultar con contador (no es mi call)

#### ¿Se puede hacer ahora?
- ✅ **Sí, completamente**: 2-3 semanas (complejo pero 100% viable)
- ⚠️ Necesita validación comercial de las reglas exactas

#### Recomendación
**HACER AHORA (es una gana):**
1. Crear BD + calculadora en backend (con tests exhaustivos)
2. UI de admin para configurar descuentos (CRUD simple)
3. Desglose en cotización actual
4. Validar con contador si afecta IVA/descuentos fiscales

---

### 5️⃣ DIVISIÓN AUTOMÁTICA POR FAMILIA (🟠 MEDIO)

#### ¿Qué implica?
```
Cliente pide:
  - 100 Tornillos (Bulonería)
  - 50 Broca Tolsen (Tolsen)
  - 10 Mechas (Mechas)

Sistema genera automáticamente:
  - Cotización #1 (solo Bulonería)
  - Cotización #2 (solo Tolsen)
  - Cotización #3 (solo Mechas)
```

#### Impacto en el proyecto
```
YA IMPLEMENTADO EN APROBACIONES:
- Agrupar por familia → subpedidos independientes ✅

CAMBIOS PENDIENTES:
- Cotización también debe dividirse (no solo pedidos)
- PDF debe generar 3 PDFs (o 1 con 3 secciones)
- Facturación: 3 comprobantes o 1 con separadores
```

#### Riesgos 🔒
- **User confusion**: Cliente ve 3 cotizaciones sin entender por qué
  - Mitigación: Mostrar "Se ha dividido en 3 por reglas comerciales"
- **Número de comprobante**: ¿Qué número le damos?
  - Mitigación: Agrupar con ID de grupo + numeración secuencial

#### ¿Se puede hacer ahora?
- ✅ **Sí, simple**: Ya dividimos en aprobaciones, copiar lógica a cotizaciones
- ⏱️ 2-3 días de trabajo

#### Recomendación
**HACER AHORA (bajo esfuerzo, alto valor):**
- Extender división de familias a cotizaciones también

---

### 6️⃣ ENTRADA DIRECTA DE PEDIDO (SIN COTIZACIÓN OBLIGATORIA) (🟡 BAJO)

#### ¿Qué implica?
```
Flujo actual: Pedido → Cotización → Aprobación → Confirmación
Flujo nuevo:  Pedido directamente sin cotización previa
```

#### Impacto en el proyecto
```
CAMBIO MÍNIMO:
- Ruta GET /nuevo-pedido → Si llega directo, no pasa por /cotizaciones
- Pedido en estado "Pendiente de Control" (no "Cotización")
- Checkbox: "¿Saltear cotización?"
```

#### Riesgos 🔒
- **Falta de revisión**: Pedido directo sin aprobación comercial
  - Mitigación: Forzar "Validar Pedido" antes de depósito
- **Descuentos no confirmados**: Cliente pide directamente sin haberse puesto de acuerdo en precio
  - Mitigación: Mostrar descuentos esperados, requiere confirmación antes de depósito

#### ¿Se puede hacer ahora?
- ✅ **Sí, trivial**: 1 día máximo

#### Recomendación
**HACER EN SPRINT PRÓXIMO (no es bloqueante):**
- Agregar opción "Pedido directo" en nuevo-pedido
- Renombrar "Validar Pedido" a algo más claro

---

### 7️⃣ CARGA MANUAL ÁGIL (AUTOCOMPLETADO) (✅ YA EXISTE)

**Estado:** ✅ **IMPLEMENTADO**
- Búsqueda difusa Fuse.js funciona bien
- Escritura de código → autocomplete instantáneo
- Edición directa de cantidades

**Mejora pendiente:** Alias de productos (req #2)

---

### 8️⃣ CAPTURA POR FOTO / OCR (🟡 EXISTE, MEJORAS PENDIENTES)

#### ¿Qué implica?
- OCR detecta productos → Carga cantidad automáticamente
- Edición 100% directa de cantidades (por teclado)
- Sin menús desplegables lentos

#### Estado actual
✅ OCR funciona (OpenAI GPT-4o-mini)  
✅ Cantidad se carga en tabla  
⚠️ Edición de cantidades puede mejorar

#### Mejoras para hacer
1. Cantidad editable inline (click en celda, edita, Enter)
2. Validación visual mientras edita (rojo si falta stock)
3. Tecla Tab entre campos sin delays

#### ¿Se puede hacer ahora?
- ✅ Sí, 1-2 días

---

### 9️⃣ LÓGICA DE CANTIDADES: GRANEL VS FRACCIÓN (🟠 COMPLEJO)

#### ¿Qué implica?
```
Tolsen:     Cliente pide 123 → Se entrega exacto 123 (sin ajustar)
Bulonería:  
  - Cliente pide "Granel" → Se mantiene granel
  - Cliente pide "Fracción/Cajas" → Se ajusta al múltiplo
    Ej: Pide 70, caja = 100 → Sugiere 100 o 0 (si no quiere redondeado)
```

#### Impacto en el proyecto
```
BD:
- Tabla `producto_unidades_fraccion` (producto_id, unidad_base, 
  cantidad_multiplo, descripcion)

BACKEND:
- Función ajustarCantidad(producto, cantidadSolicitada, familia)
  → cantidadAjustada + warnings

FRONTEND:
- Al guardar cantidad: si hay ajuste, mostrar modal:
  "Pediste 70, la caja viene de 100. ¿Confirmas 100 o cancelas?"
```

#### Riesgos 🔒
- **Sorpresa comercial**: Cliente recibe más de lo que pidió (costo)
  - Mitigación: Confirmación explícita + campo "Cantidad Solicitada" vs "Cantidad Enviada"
- **Pérdida de información**: ¿Quién decide el ajuste? Vendedor o cliente
  - Mitigación: Registrar ambas cantidades (pedida vs. final)

#### ¿Se puede hacer ahora?
- ⚠️ **Parcialmente**: Backend sí, necesita validación comercial de reglas exactas

#### Recomendación
**HACER EN FASE 2 (no es MVP):**
1. Definir exactamente las reglas (tamaño de cajas, múltiplos) con jefatura
2. Implementar + UI con confirmación
3. Campo de trazabilidad (Cantidad Solicitada vs. Enviada)

---

### 🔟 NOTA DE PEDIDO PARA DEPÓSITO (SIN PRECIOS) (🟡 BAJO)

#### ¿Qué implica?
```
Comprobante que va a depósito:
- Código, descripción, medida, cantidad
- SIN precios, montos
- Impresión física inmediata
```

#### Impacto en el proyecto
```
FRONTEND:
- Botón "Generar Nota de Pedido para Depósito"
- PDF con layout sin columnas de precios

BACKEND:
- GET /api/pedidos/:id/nota-deposito
  → PDF builder (sin precios)
```

#### ¿Se puede hacer ahora?
- ✅ **Sí, trivial**: 2-3 días

#### Recomendación
**HACER AHORA (es una gana):**
- Plantilla PDF de nota de depósito (reutiliza proforma, quita columnas de $)

---

### 1️⃣1️⃣ MATRIZ DE ESTADOS (🟠 MEDIO)

#### ¿Qué implica?
```
[Borrador] → [Pendiente de Control] → [Validado] → [Enviado a Depósito] 
→ [Corregido/Prep. Depósito] → [Listo para Facturar]
```

#### Estado actual
```
[En aprobación] → [Esperando confirmación] → [Confirmado]
```

#### Cambios pendientes
- Renombrar estados (más claros para el flujo comercial)
- Agregar transiciones "Corregido" (después de preparación en depósito)
- Trazabilidad de quién/cuándo cambió estado

#### Impacto en el proyecto
```
BD:
- Tabla `estado_pedido_log` (pedido_id, estado_anterior, estado_nuevo, 
  usuario_id, fecha, motivo)

BACKEND:
- Cambiar estados → Registrar en log

FRONTEND:
- Timeline visual de estados (cronograma)
```

#### ¿Se puede hacer ahora?
- ✅ **Sí, 1 semana**: Refactorizar estado machine actual

#### Recomendación
**HACER EN SPRINT PRÓXIMO:**
1. Renombrar estados en código
2. Agregar transición "Corregido"
3. Log de auditoría por estado
4. UI timeline en pedido

---

### 1️⃣2️⃣ TRAZABILIDAD CANTIDAD PEDIDA VS. ENVIADA (🔴 CRÍTICO)

#### ¿Qué implica?
```
Cada renglón registra:
- Cantidad Solicitada (original del cliente/foto)
- Cantidad Enviada (después de ajustar por empaque/stock)
```

#### Impacto en el proyecto
```
BD:
- Tabla `aprobaciones_items`: agregar columna `cantidad_enviada`
- Auditoría: quién cambió cantidad y por qué (faltante, empaque, etc.)

FRONTEND:
- Mostrar ambas cantidades en tabla
- Editable solo `cantidad_enviada` después de validación
```

#### Riesgos 🔒
- **Fraude**: Cambiar cantidad para cobrar más
  - Mitigación: Auditoría + aprobación requerida para cambiar cantidad enviada

#### ¿Se puede hacer ahora?
- ✅ **Sí, 3-4 días**: Agregar columna, auditoría, UI

#### Recomendación
**HACER AHORA (es crítico para trazabilidad):**
- Migración: agregar `cantidad_enviada` = `cantidad_pedida`
- UI para editar `cantidad_enviada` solo en estado "Corregido"
- Auditoría de quién cambió

---

### 1️⃣3️⃣ CONFIRMACIÓN DE CLIENTE (COTIZACIÓN vs. PEDIDO DIRECTO) (🟡 BAJO)

#### ¿Qué implica?
```
Cotización:     Requiere confirmación → Pasa a Pedido
Pedido Directo: No requiere confirmación adicional
```

#### Estado actual
✅ Confirmación funciona (link público, botón confirmar)

#### Cambio pendiente
- Si viene de "Pedido Directo", no enviar link de confirmación al cliente
- UI debe indicar en qué modo está

#### ¿Se puede hacer ahora?
- ✅ **Trivial**: 1 día

---

### 1️⃣4️⃣ FORMATO DE ENLACES (PROTOCOLO HTTPS) (✅ CASI RESUELTO)

#### ¿Qué implica?
Links en WhatsApp/email deben ser clickeables (`https://...` no texto plano)

#### Estado actual
⚠️ Links van correctos en API, posible issue en generador de mensaje

#### ¿Se puede hacer ahora?
- ✅ **Sí, 1 día**: Revisar `linkWhatsApp()`, formatear como URL completa

---

## 🎯 MATRIZ DE PRIORIZACIÓN

| Req | Feature | Complejidad | Riesgo | Impacto | DEBE HACER AHORA? | Timeline |
|-----|---------|-------------|--------|--------|-------------------|----------|
| 1 | Tango ERP | 🔴 Alta | 🔴 Alto | 🔴 Crítico | ❌ No | 4 semanas (Fase 2) |
| 2 | Mapeo códigos | 🟡 Media | 🟡 Medio | 🟠 Alto | ✅ Sí | 1 semana |
| 3 | Stock RT | 🔴 Alta | 🔴 Alto | 🔴 Crítico | ⚠️ MVP | 2 semanas |
| 4 | Descuentos | 🔴 Alta | 🟠 Medio | 🔴 Crítico | ✅ Sí | 2-3 semanas |
| 5 | División familia | 🟡 Baja | 🟡 Bajo | 🟠 Medio | ✅ Sí | 1 semana |
| 6 | Pedido directo | 🟢 Baja | 🟡 Bajo | 🟠 Medio | ✅ Sí | 2-3 días |
| 7 | Carga manual | ✅ Done | - | - | - | - |
| 8 | OCR | ✅ Done | - | - | ⚠️ Mejorar | 1-2 días |
| 9 | Granel vs Fracción | 🔴 Alta | 🟠 Medio | 🟠 Alto | ❌ No | 3 semanas (Fase 2) |
| 10 | Nota depósito | 🟢 Baja | 🟢 Bajo | 🟠 Medio | ✅ Sí | 2-3 días |
| 11 | Estados | 🟡 Media | 🟡 Medio | 🟠 Alto | ✅ Sí | 1 semana |
| 12 | Trazabilidad | 🔴 Alta | 🔴 Alto | 🔴 Crítico | ✅ Sí | 1 semana |
| 13 | Confirmación | 🟢 Baja | 🟡 Bajo | 🟡 Bajo | ⚠️ Después | 1 día |
| 14 | Enlaces HTTPS | 🟢 Baja | 🟢 Bajo | 🟢 Bajo | ✅ Sí | 1 día |

---

## 📈 ROADMAP RECOMENDADO

### 🔵 SPRINT 1 (2 semanas) - MVP MEJORADO
- ✅ Mapeo de códigos productos (+ alias)
- ✅ Motor de descuentos complejos
- ✅ Trazabilidad (Cantidad Solicitada vs. Enviada)
- ✅ Matriz de estados mejorada
- ✅ Nota de pedido sin precios
- ✅ Pedido directo (opcional)
- ✅ Formato links HTTPS
- ⚠️ OCR mejorado (inline edit cantidades)
- **Esfuerzo:** 1 fullstack + 1 QA = 2 semanas

### 🟣 SPRINT 2 (2 semanas) - STOCK + FLUJO DEPÓSITO
- ✅ Stock RT (mock Tango + caché local)
- ✅ Lógica Granel vs. Fracción
- ✅ Edición post-preparación en depósito
- ✅ Botón "Validar Pedido" con reserva
- ⚠️ Confirmación de cliente
- **Esfuerzo:** 1 fullstack = 2 semanas

### 🔴 SPRINT 3+ (4 semanas) - INTEGRACIÓN TANGO
- ✅ Tango ERP API (setup credenciales + sandbox)
- ✅ Sincronización bidireccional clientes
- ✅ Stock real-time desde Tango
- ✅ Facturación integrada (no en app, envío a Tango)
- **Esfuerzo:** 1-2 fullstack = 4 semanas

---

## 🔒 SEGURIDAD - PLAN DE MITIGACIÓN

### Críticos (HACER ANTES DE SPRINT 1)
| Riesgo | Mitigación | Dificultad |
|--------|-----------|-----------|
| Manipulación de precios/descuentos | Validar 100% en backend, nunca confiar en frontend | 🟡 Baja |
| Inyección SQL en búsqueda | Ya implementado (PDO + prepared statements) | ✅ Done |
| Fraude de stock | Auditoría + logs de cambio | 🟡 Baja |
| Datos stale de Tango | TTL en caché + validación en validar-pedido | 🟡 Baja |

### Altos (HACER EN SPRINT 1)
| Riesgo | Mitigación | Dificultad |
|--------|-----------|-----------|
| Credenciales Tango en plaintext | Env vars + encryption at rest (later) | 🟡 Baja |
| Race condition en stock | Reserva temporal + lock en validación | 🟠 Media |
| Inconsistencia cantidades (pedida vs enviada) | Campo de auditoría + logs | 🟡 Baja |
| Cambio de cantidades sin trazabilidad | Log cada cambio con usuario/fecha/motivo | 🟡 Baja |

### Medios (SPRINT 2+)
- Rate limiting en APIs (prevenir bot scraping)
- Encrypted DB for Tango credentials
- Webhook signature validation (Tango → app)
- PII handling (CUIT, razón social)

---

## ⚡ CONCLUSIONES TÉCNICAS

### LO QUE PUEDE ENTRAR EN SPRINT 1-2
1. ✅ Descuentos complejos (bien definido, aislado)
2. ✅ Mapeo códigos (simple DB + búsqueda)
3. ✅ Estados + trazabilidad (refactor controlado)
4. ✅ Nota de depósito (template PDF)
5. ✅ Stock RT con mock (sin Tango real)

**Esfuerzo realista:** 4 semanas, 1-2 fullstack, 1 QA

### LO QUE NO PUEDE ENTRAR AÚN
1. ❌ Tango ERP real (sin credenciales + sandbox)
2. ❌ Granel vs Fracción (reglas comerciales no definidas)
3. ❌ Sincronización real-time (necesita webhook + Redis)

**Bloqueantes:** Tango API docs + credenciales sandbox

---

## 📋 PRÓXIMOS PASOS RECOMENDADOS

### Antes de empezar Sprint 1
1. [ ] **Sesión comercial:** Validar reglas de descuentos exactas (%)
2. [ ] **Sesión de tamaños:** Cajas/múltiplos de cada familia
3. [ ] **Prueba de concepto:** Mock Tango ERP (estructura de API)
4. [ ] **Definición de estados:** Renombrar estados, documentar transiciones

### Durante Sprint 1
1. [ ] Implementar descuentos + tests unitarios
2. [ ] Mapeo de códigos + aliases
3. [ ] Trazabilidad en BD + logs
4. [ ] QA de cada feature (no dejar para el final)

### Paralelamente (Preparación para Sprint 2)
1. [ ] Contactar Tango → obtener credenciales sandbox
2. [ ] Leer documentación API Tango (stock, clientes, facturación)
3. [ ] Diseñar caché de stock (Redis o simple TTL)
4. [ ] Definir reservas (duración, comportamiento)

---

## 🎯 MI RECOMENDACIÓN COMO FULLSTACK

**No lo intentes todo de una vez.** El documento mezclaa cosas simples (nota PDF) con cosas complejas (Tango ERP). 

**Apruebc esto:**
1. **Sprint 1 (2 sem):** Descuentos + códigos + trazabilidad (todo isolado, bajo riesgo)
2. **Sprint 2 (2 sem):** Stock mock + depósito workflow (depende de Tango mock)
3. **Sprint 3 (4 sem):** Integración Tango real (cuando tengan credenciales)

**Evita:**
- Integrar Tango sin sandbox (arriesgado en prod)
- Implementar granel/fracción sin definición comercial clara
- Hacer todo simultáneo (aumenta deuda técnica)

**Beneficio del plan:**
- Semana 4: Versión 2.0 lista con 80% de los features
- Usuarios pueden usar mercado la mitad del camino
- Riesgos mitigados incrementalmente, no de golpe

---

## ❓ PREGUNTAS PARA USTEDES

Antes de empezar, necesito claridad en:

1. **¿Tienen credenciales de sandbox de Tango ya?** (Si no, es bloqueante para Sprint 2)
2. **¿Quiénes aprueban el motor de descuentos?** (Jefatura comercial/contable)
3. **¿Impresora en depósito?** (Para nota sin precios)
4. **¿Timeline final?** (¿4 semanas es realista? ¿8 semanas?)
5. **¿Recursos disponibles?** (1 dev? 2 devs?)

---

**DOCUMENTO GENERADO:** 2026-08-13  
**ESTADO:** 🔵 Listo para sesión de refinamiento  
**PRÓXIMO PASO:** Validar con jefatura comercial + Tango
