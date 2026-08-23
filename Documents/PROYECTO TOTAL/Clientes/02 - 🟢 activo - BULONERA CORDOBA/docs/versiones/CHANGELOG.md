# Historial de versiones

Cada versión está etiquetada en Git. Para volver a cualquiera:

```
git checkout <etiqueta>
```

| Versión | Etiqueta | Qué cambió |
|---|---|---|
| **V009** | `v9.0-codigo-cantidad-bultos` | Código de producto en las dos vistas que faltaban, cantidad enviada editable y bultos del envío |
| V008 | — | Tema oscuro con paneles de vidrio y fondo de marca |
| V007 | — | Cadena de precios simplificada, cliente obligatorio, campos sin flechas |
| V006 | — | El descuento por familia pasa a funcionar como tope del pedido |
| V005 | — | Ajuste de descuento editable por familia dentro del pedido |
| V004 | — | Motor de descuentos encadenados, nota de depósito sin precios, pedido directo |
| V003 | `v3.0-electrodos-depositos` | Familia Electrodos, depósitos con responsable, reemplazo por falta de stock |
| V002 | `v2.2-checkpoint-configuraciones` | Módulo de configuraciones editable desde la interfaz |
| V001 | `v2.1-checkpoint-base` | Primera versión en producción |

Los detalles de V002, V003, V004 y V009 están en los archivos de esta carpeta.
V005 a V008 no tienen documento propio; el detalle está en el mensaje de su commit:

```
git log --oneline --all
git show <hash>
```

---

## Convenciones que se fueron fijando

**Signos de descuento (desde V007).** Negativo descuenta, positivo aumenta. Vale
tanto para las familias como para la condición de pago. Los pedidos anteriores a
V007 se corrigieron con la migración `011-signo-condicion-pago.sql`.

**Migraciones.** Van en `api-php/db/`, numeradas y en orden. El runner
(`npm run migrate`) las aplica una sola vez y las anota en la tabla `migraciones`.
Son idempotentes: correrlo dos veces no rompe nada.

**Familias y depósitos.** Bulonería (1), Tolsen (2), Mechas (3), Electrodos (4).
El cliente pidió reagrupar a dos depósitos; está pendiente de confirmación y es la
etapa 3 del plan de trabajo.

**Documentos que se imprimen.** La proforma, la nota de depósito y la pantalla de
confirmación del cliente quedan en blanco aunque el resto de la aplicación esté en
tema oscuro. Se aíslan con la clase `.documento`.
