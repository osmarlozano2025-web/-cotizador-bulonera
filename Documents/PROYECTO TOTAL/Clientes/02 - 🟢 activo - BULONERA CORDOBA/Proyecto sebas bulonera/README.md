# Córdoba Bulones ERP

Base frontend de la plataforma comercial de Córdoba Bulones. El repositorio inicia una aplicación empresarial modular, preparada para crecer hacia múltiples empresas, sucursales, usuarios y roles sin acoplarse todavía a una base de datos o proveedor externo.

## Alcance actual

- Shell visual y dashboard inicial no funcional.
- Límites de módulos comerciales, sin lógica de negocio.
- Contratos base para identidad, contexto organizacional, API y autenticación.
- Infraestructura central de roles, permisos, matriz de acceso, guards y rutas futuras.
- Layout empresarial responsive con navegación lateral, header, breadcrumb, contenido y footer.
- Páginas placeholder para validar la navegación sin implementar módulos comerciales.
- Módulo funcional de productos con catálogo, alta, edición, detalle y validaciones simuladas.
- Módulo funcional de approvals con listado, detalle y relación simulada con cotizaciones y pedidos.
- Módulo funcional de cotizaciones con listado, formulario, detalle, duplicado y conversión simulada.
- Módulo funcional de pedidos con listado, alta, edición, detalle, flujo de estados y simulación de autorización.
- Módulo funcional de cuenta corriente con resumen, detalle, movimientos y simulación de ajustes / autorizaciones.
- Infraestructura base para Supabase Auth, modo mock/supabase y esquema SQL inicial versionado.
- Infraestructura para rutas, datos remotos, formularios y validaciones.
- Módulo aislado reservado para la futura integración con Tango, con colas, mapeos, diagnóstico y adaptadores mock.

La autenticación real y la persistencia con Supabase están preparadas como infraestructura progresiva; el modo mock sigue disponible mientras se completa la migración de datos.

## Tecnologías

React, TypeScript estricto, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Lucide React y React Router DOM.

## Inicio local

```bash
npm install
cp .env.example .env
npm run dev
```

Validaciones:

```bash
npm run lint
npm run build
```

## Documentación

- [Visión general](docs/vision-general.md)
- [Arquitectura](docs/arquitectura.md)
- [Estructura](docs/estructura.md)
- [Roadmap](docs/roadmap.md)
- [Roles](docs/roles.md)
- [Permisos](docs/permissions.md)
- [Flujo de autorización](docs/authorization-flow.md)
- [Modelo de dominio](docs/domain-model.md)
- [Reglas de negocio](docs/business-rules.md)
- [Relaciones entre entidades](docs/entity-relationships.md)
- [Transiciones de estado](docs/state-transitions.md)
- [Layout general](docs/layout.md)
- [Navegación](docs/navigation.md)
- [Dashboard](docs/dashboard.md)
- [Integración con Tango](docs/tango-integration.md)
- [Arquitectura Tango](docs/tango-architecture.md)
- [Conectores Tango](docs/tango-connectors.md)
- [Mapeo de datos Tango](docs/tango-data-mapping.md)
- [Jobs Tango](docs/tango-sync-jobs.md)
- [Errores Tango](docs/tango-errors.md)
- [Seguridad Tango](docs/tango-security.md)
- [Conector local Tango](docs/tango-local-connector.md)
- [Relevamiento Tango](docs/tango-relevamiento.md)
- [Módulos](docs/modulos.md)
- [Módulo de productos](docs/products-module.md)
- [Módulo de approvals](docs/approvals-module.md)
- [Módulo de cotizaciones](docs/quotes-module.md)
- [Módulo de pedidos](docs/orders-module.md)
- [Módulo de cuenta corriente](docs/accounts-module.md)
- [Supabase setup](docs/supabase-setup.md)
- [Authentication](docs/authentication.md)
- [Database schema](docs/database-schema.md)
- [Data provider](docs/data-provider.md)

## Modelo de dominio

La aplicación ya cuenta con una capa de dominio independiente en `src/domain` que centraliza identidades, entidades comerciales, reglas puras, transiciones de estado y contratos de integración futura. Esta capa no persiste datos ni depende de Supabase; solo define la estructura que consumirá el resto del ERP cuando lleguen autenticación, backend e integraciones externas.

## Convenciones

El código, los identificadores y los nombres de archivo están en inglés. La documentación y los comentarios explicativos están en español. Los módulos exponen una API pública y no consumen detalles internos de otros módulos.

## Autorización

Toda decisión visual debe utilizar permisos exportados por `@/features/auth`; no se repiten strings ni se autorizan acciones únicamente por nombre de rol. Los guards frontend no sustituyen la autorización futura en servidor y las políticas RLS.
