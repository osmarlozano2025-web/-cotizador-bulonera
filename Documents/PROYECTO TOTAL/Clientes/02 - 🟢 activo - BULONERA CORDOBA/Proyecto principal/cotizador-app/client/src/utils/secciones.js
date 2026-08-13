export const SECCIONES = [
  {
    titulo: 'Comerciales',
    items: [
      { to: '/', label: 'Nuevo Pedido', icon: '🧾', end: true, key: 'nuevo-pedido' },
      { to: '/aprobaciones', label: 'Aprobaciones', icon: '✅', key: 'aprobaciones' },
      { to: '/cotizaciones', label: 'Cotizaciones', icon: '📄', key: 'cotizaciones' },
    ],
  },
  {
    titulo: 'Configuraciones',
    items: [
      { to: '/clientes', label: 'Clientes', icon: '👥', key: 'clientes' },
      { to: '/productos', label: 'Productos', icon: '📦', key: 'productos' },
      { to: '/integraciones', label: 'Integraciones', icon: '🔌', key: 'integraciones' },
      { to: '/personal', label: 'Personal', icon: '🧑‍💼', key: 'personal' },
    ],
  },
]

const TODAS = SECCIONES.flatMap(sec => sec.items)

export function primeraRutaPermitida(user) {
  const permitida = TODAS.find(item => user?.permisos?.secciones?.includes(item.key))
  return permitida?.to || null
}
