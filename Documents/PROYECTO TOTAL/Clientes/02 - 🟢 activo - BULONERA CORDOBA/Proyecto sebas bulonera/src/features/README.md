# Funcionalidades

Cada carpeta representa un límite funcional independiente. La estructura interna (`api`, `components`, `hooks`, `schemas`, `types`) se agregará solamente cuando el módulo se implemente; evitar carpetas vacías reduce ruido.

Los módulos no deben importar detalles internos de otros módulos. La coordinación transversal se realizará mediante contratos públicos y servicios de aplicación.
