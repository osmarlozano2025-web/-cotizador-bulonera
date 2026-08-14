import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Configuraciones() {
  const { user, token } = useAuth()
  const [config, setConfig] = useState(null)
  const [personal, setPersonal] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [valores, setValores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)

  useEffect(() => {
    cargarConfiguraciones()
    fetch('/api/personal', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then(setPersonal)
      .catch(() => {})
  }, [])

  // Asigna el responsable de un depósito conservando el resto de su configuración
  const asignarResponsable = async (familia, responsableId) => {
    const dep = config.depositos[familia]
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/configuraciones/deposito_${familia}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          valor: {
            numero: dep.numero,
            familia,
            nombre: dep.nombre,
            responsableId: responsableId || null,
          },
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar')
      setExito('✅ Responsable actualizado')
      setTimeout(() => setExito(null), 3000)
      await cargarConfiguraciones()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Guarda una clave de configuración con un valor JSON cualquiera.
  const guardarClave = async (clave, valor, mensaje) => {
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/configuraciones/${clave}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar')
      setExito(mensaje || '✅ Guardado')
      setTimeout(() => setExito(null), 3000)
      await cargarConfiguraciones()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const cargarConfiguraciones = async () => {
    try {
      setCargando(true)
      const res = await fetch('/api/configuraciones')
      if (!res.ok) throw new Error('Error al cargar configuraciones')
      const data = await res.json()
      setConfig(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleEditar = (clave, valor) => {
    setEditando(clave)
    setValores(JSON.parse(JSON.stringify(valor)))
    setError(null)
  }

  const handleCancelar = () => {
    setEditando(null)
    setValores({})
  }

  const handleGuardar = async () => {
    try {
      setGuardando(true)
      setError(null)

      const res = await fetch(`/api/configuraciones/${editando}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ valor: valores }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      setExito('✅ Guardado correctamente')
      setTimeout(() => setExito(null), 3000)
      setEditando(null)
      await cargarConfiguraciones()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (user?.rol !== 'Administrador') {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg max-w-lg">
        ⚠️ Solo administradores pueden acceder a esta sección
      </div>
    )
  }

  if (cargando) {
    return <div className="p-4 text-gray-500">Cargando configuraciones...</div>
  }

  if (!config) {
    return <div className="p-4 text-red-600">Error al cargar configuraciones</div>
  }

  const rangoMin = config.rango_descuento?.min ?? -50
  const rangoMax = config.rango_descuento?.max ?? 50

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Configuraciones</h1>
        <p className="text-sm text-gray-600 mt-1">Gestiona descuentos, tiempos y otras reglas de negocio</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ❌ {error}
        </div>
      )}

      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {exito}
        </div>
      )}

      {/* DEPÓSITOS Y RESPONSABLES */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">🏭 Depósitos y responsables</h2>
          <p className="text-xs text-gray-600 mt-1">
            Cada familia se despacha desde su depósito. El responsable asignado sólo ve los pedidos de su depósito.
          </p>
        </div>

        <div className="space-y-3 p-6">
          {config.depositos && Object.entries(config.depositos).map(([familia, dep]) => (
            <div key={familia} className="flex items-center justify-between gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                  {dep.numero}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 capitalize">{familia}</h3>
                  <p className="text-xs text-gray-500">
                    {dep.responsableNombre
                      ? `Responsable: ${dep.responsableNombre}`
                      : 'Sin responsable asignado — lo ven todos los depósitos'}
                  </p>
                </div>
              </div>

              <select
                value={dep.responsableId || ''}
                onChange={(e) => asignarResponsable(familia, e.target.value)}
                disabled={guardando}
                className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="">— Sin asignar —</option>
                {personal.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.rol})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* RANGO PERMITIDO */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">🎚️ Rango permitido</h2>
          <p className="text-xs text-gray-600 mt-1">
            Los topes por familia no pueden salirse de acá.
            <strong className="ml-1">Negativo descuenta, positivo aumenta.</strong>
          </p>
        </div>

        <div className="p-6 flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Mínimo
            </label>
            <input
              type="number"
              step="1"
              defaultValue={rangoMin}
              onBlur={(e) => {
                const min = Number(e.target.value)
                if (min !== rangoMin) guardarClave('rango_descuento', { min, max: rangoMax }, '✅ Rango actualizado')
              }}
              disabled={guardando}
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <span className="pb-2.5 text-gray-400">a</span>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Máximo
            </label>
            <input
              type="number"
              step="1"
              defaultValue={rangoMax}
              onBlur={(e) => {
                const max = Number(e.target.value)
                if (max !== rangoMax) guardarClave('rango_descuento', { min: rangoMin, max }, '✅ Rango actualizado')
              }}
              disabled={guardando}
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-gray-400 pb-2.5">
            Hoy: de {rangoMin}% a {rangoMax}%
          </p>
        </div>
      </section>

      {/* DESCUENTOS POR FAMILIA */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">📦 Descuentos por Familia</h2>
          <p className="text-xs text-gray-600 mt-1">
            Es el <strong>tope</strong> de cada familia: lo máximo que se puede dar en un pedido.
            Negativo descuenta, positivo aumenta. En el pedido el campo arranca en 0 y se puede
            mejorar hasta acá.
          </p>
        </div>

        <div className="p-6 space-y-3">
          {config.descuentos_familia && Object.entries(config.descuentos_familia).map(([familia, limite]) => (
            <div key={familia} className="flex items-center justify-between gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 capitalize">{familia}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {limite === 0
                    ? 'No admite descuento: en el pedido queda fijo en 0'
                    : limite < 0
                      ? `En el pedido se puede cargar de ${limite}% a 0%`
                      : `En el pedido se puede cargar de 0% a +${limite}%`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  step="0.5"
                  min={rangoMin}
                  max={rangoMax}
                  defaultValue={limite}
                  onBlur={(e) => {
                    const v = Math.max(rangoMin, Math.min(rangoMax, Number(e.target.value)))
                    if (v !== limite) {
                      guardarClave(`descuento_${familia}`, { limite: v }, '✅ Descuento actualizado')
                    }
                  }}
                  disabled={guardando}
                  className={`w-24 px-3 py-2 border rounded-lg text-sm text-right focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    limite < 0
                      ? 'border-green-300 text-green-700 focus:ring-green-500'
                      : limite > 0
                        ? 'border-amber-300 text-amber-700 focus:ring-amber-500'
                        : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 pt-1">
            Rango permitido: de {rangoMin}% a {rangoMax}%. Se edita más arriba.
          </p>
        </div>
      </section>

      {/* CONDICIÓN DE PAGO */}
      <section className="tarjeta overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-violet-50 to-transparent">
          <h2 className="text-lg font-semibold text-slate-900">💳 Condición de pago</h2>
          <p className="text-xs text-slate-600 mt-1">
            Puede descontar o aumentar. <strong>Negativo descuenta, positivo aumenta.</strong>
          </p>
        </div>

        <div className="p-6 space-y-3">
          {config.descuentos_pago && Object.entries(config.descuentos_pago).map(([tipo, valor]) => (
            <div key={tipo} className="flex items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">
                  {tipo === 'contado' ? 'Contado' : tipo === '30dias' ? '30 días' : '60 días'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {valor === 0
                    ? 'No modifica el precio'
                    : valor < 0
                      ? `${-valor}% de descuento`
                      : `${valor}% de recargo`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  inputMode="decimal"
                  min={rangoMin}
                  max={rangoMax}
                  defaultValue={valor}
                  onBlur={(e) => {
                    const v = Math.max(rangoMin, Math.min(rangoMax, Number(e.target.value)))
                    if (v !== valor) {
                      guardarClave(`descuento_${tipo}`, { valor: v }, '✅ Condición de pago actualizada')
                    }
                  }}
                  disabled={guardando}
                  className={`tabular w-24 px-3 py-2 border rounded-xl text-sm text-right focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    valor < 0
                      ? 'border-emerald-300 text-emerald-700 focus:ring-emerald-400'
                      : valor > 0
                        ? 'border-amber-300 text-amber-700 focus:ring-amber-400'
                        : 'border-slate-300 focus:ring-[var(--cb-500)]'
                  }`}
                />
                <span className="text-sm text-slate-400">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STOCK Y CACHE */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">⚡ Stock y Caché</h2>
          <p className="text-xs text-gray-600 mt-1">Tiempos de reserva y actualizaciones</p>
        </div>

        <div className="space-y-4 p-6">
          {config.stock && (
            <>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-900">
                  ⏱️ Tiempo de reserva de stock
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {config.stock.tiempo_reserva_minutos} minutos
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Tiempo que se mantiene un producto reservado en un pedido sin confirmar
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-900">
                  🔄 TTL del caché de stock
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {config.stock.cache_ttl_segundos} segundos
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Tiempo que se guarda en caché el estado del stock antes de consultar BD
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
        ℹ️ <strong>Nota:</strong> Los cambios se aplican inmediatamente. El caché se actualiza automáticamente en los próximos 5 minutos.
      </div>
    </div>
  )
}
