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

  // Enciende o apaga el motor de descuentos por familia y condición de pago.
  const cambiarMotor = async (cambios) => {
    const actual = config.motor_descuentos || { activo: false, base: 'lista' }
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch('/api/configuraciones/motor_descuentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor: { ...actual, ...cambios } }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar')
      setExito('✅ Motor de descuentos actualizado')
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

      {/* AJUSTE POR FAMILIA */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">🎚️ Ajuste por familia</h2>
          <p className="text-xs text-gray-600 mt-1">
            Se precarga al armar un pedido y el vendedor lo puede cambiar renglón por familia.
            <strong className="ml-1">Negativo descuenta, positivo aumenta.</strong>
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Mínimo permitido
              </label>
              <input
                type="number"
                step="1"
                defaultValue={config.rango_descuento?.min ?? -50}
                onBlur={(e) => {
                  const min = Number(e.target.value)
                  if (min !== (config.rango_descuento?.min ?? -50)) {
                    guardarClave('rango_descuento', { min, max: config.rango_descuento?.max ?? 50 }, '✅ Rango actualizado')
                  }
                }}
                disabled={guardando}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
            <span className="pb-2.5 text-gray-400">a</span>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Máximo permitido
              </label>
              <input
                type="number"
                step="1"
                defaultValue={config.rango_descuento?.max ?? 50}
                onBlur={(e) => {
                  const max = Number(e.target.value)
                  if (max !== (config.rango_descuento?.max ?? 50)) {
                    guardarClave('rango_descuento', { min: config.rango_descuento?.min ?? -50, max }, '✅ Rango actualizado')
                  }
                }}
                disabled={guardando}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-gray-400 pb-2.5">
              Hoy: de {config.rango_descuento?.min ?? -50}% a {config.rango_descuento?.max ?? 50}%
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {config.ajustes_familia && Object.entries(config.ajustes_familia).map(([familia, valor]) => (
              <div key={familia} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 capitalize text-sm">{familia}</h3>
                  <p className="text-xs text-gray-500">
                    {valor === 0
                      ? 'Sin ajuste'
                      : valor < 0
                        ? `${-valor}% de descuento`
                        : `${valor}% de aumento`}
                  </p>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min={config.rango_descuento?.min ?? -50}
                  max={config.rango_descuento?.max ?? 50}
                  defaultValue={valor}
                  onBlur={(e) => {
                    const v = Number(e.target.value)
                    if (v !== valor) guardarClave(`ajuste_${familia}`, { valor: v }, '✅ Ajuste actualizado')
                  }}
                  disabled={guardando}
                  className={`w-24 px-3 py-2 border rounded-lg text-sm text-right focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    valor < 0
                      ? 'border-green-300 text-green-700 focus:ring-green-500'
                      : valor > 0
                        ? 'border-amber-300 text-amber-700 focus:ring-amber-500'
                        : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOTOR DE DESCUENTOS */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">🔀 Motor de descuentos</h2>
          <p className="text-xs text-gray-600 mt-1">
            Decide si los descuentos de más abajo se aplican de verdad al precio, o si sólo quedan documentados.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 border border-gray-200 rounded-lg">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">
                {config.motor_descuentos?.activo ? 'Encendido' : 'Apagado'}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {config.motor_descuentos?.activo
                  ? 'Los precios salen de aplicar, encadenados, el descuento de familia + el de condición de pago + el del cliente sobre el precio de lista.'
                  : 'Los precios se calculan como siempre: precio de granel menos el descuento del cliente. Los porcentajes de abajo no afectan nada todavía.'}
              </p>
            </div>

            <button
              onClick={() => cambiarMotor({ activo: !config.motor_descuentos?.activo })}
              disabled={guardando}
              className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 ${
                config.motor_descuentos?.activo
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {config.motor_descuentos?.activo ? 'Apagar' : 'Encender'}
            </button>
          </div>

          {!config.motor_descuentos?.activo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-1.5">
              <p className="font-semibold">Antes de encenderlo, tené en cuenta que cambian todos los precios.</p>
              <p>
                Los precios de granel cargados hoy ya traen descuentos aplicados que no coinciden con los
                porcentajes de acá abajo: Bulonería trae 50%, Mechas 70,11%, y Tolsen y Electrodos ninguno.
              </p>
              <p>Si se enciende, tomando el precio de lista como base, los precios quedarían así:</p>
              <ul className="pl-4 list-disc space-y-0.5">
                <li>Bulonería: <strong>+50%</strong> respecto de hoy</li>
                <li>Tolsen: <strong>−63,1%</strong> respecto de hoy</li>
                <li>Mechas: <strong>+23,5%</strong> respecto de hoy</li>
                <li>Electrodos: sin cambios</li>
              </ul>
              <p>Los pedidos ya emitidos no se tocan: cada uno guarda el desglose con el que se hizo.</p>
            </div>
          )}
        </div>
      </section>

      {/* DESCUENTOS POR FAMILIA */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">📦 Descuentos por Familia</h2>
          <p className="text-xs text-gray-600 mt-1">
            Se aplican encadenados: 55% + 18% da 63,1% de descuento, no 73%.
          </p>
        </div>

        <div className="space-y-3 p-6">
          {config.descuentos_familia && Object.entries(config.descuentos_familia).map(([familia, desc]) => (
            <div key={familia} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 capitalize">{familia}</h3>

                {editando === `descuento_${familia}` ? (
                  <div className="flex gap-3 mt-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-600 block mb-1">Descuento 1 (%)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={valores.desc_1 ?? 0}
                        onChange={(e) => setValores({ ...valores, desc_1: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600 block mb-1">Descuento 2 (%)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={valores.desc_2 ?? 0}
                        onChange={(e) => setValores({ ...valores, desc_2: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {desc?.desc_1 ?? 0}% + {desc?.desc_2 ?? 0}%
                    </span>
                  </p>
                )}
              </div>

              {editando === `descuento_${familia}` ? (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    {guardando ? '⏳' : '✅'} Guardar
                  </button>
                  <button
                    onClick={handleCancelar}
                    disabled={guardando}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleEditar(`descuento_${familia}`, desc || {})}
                  className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  ✏️ Editar
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* DESCUENTOS POR PAGO */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-transparent px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">💳 Descuentos por Condición de Pago</h2>
          <p className="text-xs text-gray-600 mt-1">Descuentos adicionales según forma de pago</p>
        </div>

        <div className="space-y-3 p-6">
          {config.descuentos_pago && Object.entries(config.descuentos_pago).map(([tipo, desc]) => (
            <div key={tipo} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {tipo === 'contado' ? '🏷️ Contado' : tipo === '30dias' ? '📅 30 días' : '📅 60 días'}
                </h3>

                {editando === `descuento_pago_${tipo}` ? (
                  <div className="flex gap-3 mt-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-600 block mb-1">Descuento 1 (%)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={valores.desc_1 ?? 0}
                        onChange={(e) => setValores({ ...valores, desc_1: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-600 block mb-1">Descuento 2 (%)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={valores.desc_2 ?? 0}
                        onChange={(e) => setValores({ ...valores, desc_2: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {desc?.desc_1 ?? 0}% + {desc?.desc_2 ?? 0}%
                    </span>
                  </p>
                )}
              </div>

              {editando === `descuento_pago_${tipo}` ? (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    {guardando ? '⏳' : '✅'} Guardar
                  </button>
                  <button
                    onClick={handleCancelar}
                    disabled={guardando}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleEditar(`descuento_pago_${tipo}`, desc || {})}
                  className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  ✏️ Editar
                </button>
              )}
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
