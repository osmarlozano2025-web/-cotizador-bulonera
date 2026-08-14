# AGENTS.md — Bulonera Cordoba

Este cliente esta activo y contiene proyectos de cotizacion, carga de productos y material de cliente.

## Objetivo

Mantener separadas las versiones y recursos de Bulonera Cordoba sin romper las carpetas de codigo existentes.

## Estructura visible

- `BULONERA setup vscode`: proyecto con estructura PHP, documentos del cliente y configuracion.
- `Proyecto principal`: proyecto principal con app de cotizador.
- `.Codex`: control creado para este nivel de cliente.
- `assets`: archivos sueltos o pendientes de clasificar a nivel cliente.
- `docs`: documentacion general del cliente.

## Reglas

- No mover `node_modules`, `src`, `api`, `client`, `server` ni carpetas tecnicas sin revisar el proyecto puntual.
- Si aparece material suelto, clasificarlo en `assets/99 - pendientes-clasificar`.
- Registrar decisiones importantes en `.Codex/historial.md`.
