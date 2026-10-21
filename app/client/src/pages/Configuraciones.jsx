import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { etiquetaFamilia } from '../utils/aprobaciones'
import { esAdmin } from '../utils/roles'

/** Vienen desde la primera versión y se guardan bajo la clave 'descuento_*'. */
const CONDICIONES_DE_FABRICA = ['contado', '30dias', '60dias']

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
  const [valoresTempDescuentos, setValoresTempDescuentos] = useState({})
  const [nuevaPago, setNuevaPago] = useState({ nombre: '', valor: 0 })
  const [mostrarNuevaPago, setMostrarNuevaPago] = useState(false)

  useEffect(() => {
    cargarConfiguraciones()
    fetch('/api/personal', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then(setPersonal)
      .catch(() => {})
  }, [])

  /**
   * Asigna el responsable de un depósito.
   *
   * Los depósitos se guardan como una sola lista, así que se reescribe entera
   * cambiando nada más el responsable del que corresponde. Se conservan las
   * familias de cada uno: son la configuración de qué despacha cada galpón.
   */
  const asignarResponsable = async (numero, responsableId) => {
    const lista = (config.depositos || []).map((d) => ({
      numero: d.numero,
      nombre: d.nombre,
      familias: d.familias,
      responsableId: d.numero === numero ? (responsableId || null) : (d.responsableId || null),
    }))

    setGuardando(true)
    setError(null)
    try {
      const res = await fetch('/api/configuraciones/depositos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor: lista }),
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

      // Al editar un tope se retoca el valor en memoria: recargar entero haría
      // saltar la página al principio mientras se está tipeando en la lista.
      // Una condición de pago nueva sí necesita releer, porque no existía.
      const familia = clave.startsWith('descuento_') && clave.replace('descuento_', '')
      if (familia && familia in (config?.descuentos_familia || {})) {
        setConfig(prev => ({
          ...prev,
          descuentos_familia: { ...prev.descuentos_familia, [familia]: valor.limite },
        }))
      } else {
        await cargarConfiguraciones(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  /**
   * Da de baja una condición de pago agregada por el usuario.
   *
   * Las tres de fábrica no se pueden borrar: el motor de precios las
   * reconstruye en cada lectura y 'contado' es además a lo que cae un pedido
   * cuya condición ya no existe. Por eso el tachito sólo sale en las otras.
   */
  const eliminarCondicionPago = async (tipo) => {
    const nombre = config.etiquetas_pago?.[tipo] || tipo
    if (!confirm(`¿Eliminar la condición "${nombre}"?`)) return

    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/configuraciones/pago_${tipo}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar')
      setExito('✅ Condición de pago eliminada')
      setTimeout(() => setExito(null), 3000)
      await cargarConfiguraciones(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  // `silencioso` relee sin vaciar la pantalla: se usa después de guardar,
  // donde mostrar el cartel de "cargando" haría parpadear toda la página.
  const cargarConfiguraciones = async (silencioso = false) => {
    try {
      if (!silencioso) setCargando(true)
      const res = await fetch('/api/configuraciones', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Error al cargar configuraciones')
      const data = await res.json()
      setConfig(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silencioso) setCargando(false)
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

  if (!esAdmin(user)) {
    return (
      <div className="p-4 text-rose-400 bg-rose-500/10 rounded-lg max-w-lg">
        ⚠️ Solo administradores pueden acceder a esta sección
      </div>
    )
  }

  if (cargando) {
    return <div className="p-4 text-slate-400">Cargando configuraciones...</div>
  }

  if (!config) {
    return <div className="p-4 text-rose-400">Error al cargar configuraciones</div>
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">⚙️ Configuraciones</h1>
        <p className="text-sm text-slate-300 mt-1">Gestiona descuentos, tiempos y otras reglas de negocio</p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 text-rose-400">
          ❌ {error}
        </div>
      )}

      {exito && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-emerald-400">
          {exito}
        </div>
      )}

      {/* DEPÓSITOS Y RESPONSABLES */}
      <section className="bg-white/5 rounded-lg shadow-sm border border-white/10 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500/15 to-transparent px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-slate-100">🏭 Depósitos y responsables</h2>
          <p className="text-xs text-slate-300 mt-1">
            Cada depósito despacha una o más familias. El responsable asignado sólo ve los
            pedidos que le tocan. Una familia nueva entra al primer depósito hasta que se la ubique.
          </p>
        </div>

        <div className="space-y-3 p-6">
          {(config.depositos || []).map((dep) => (
            <div key={dep.numero} className="flex items-center justify-between gap-4 p-4 border border-white/10 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                  {dep.numero}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-100">{dep.nombre}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Despacha{' '}
                    {(dep.familias || []).map((f, i) => (
                      <span key={f}>
                        {i > 0 && ', '}
                        <span className="text-slate-300">{etiquetaFamilia(config, f)}</span>
                      </span>
                    ))}
                  </p>
                  <p className="text-xs text-slate-400">
                    {dep.responsableNombre
                      ? `Responsable: ${dep.responsableNombre}`
                      : 'Sin responsable — lo ve cualquiera con permiso de aprobar'}
                  </p>
                </div>
              </div>

              <select
                value={dep.responsableId || ''}
                onChange={(e) => asignarResponsable(dep.numero, e.target.value)}
                disabled={guardando}
                className="shrink-0 px-3 py-2 border border-white/10 rounded-lg text-sm bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
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

      {/* DESCUENTOS POR FAMILIA */}
      <section className="bg-white/5 rounded-lg shadow-sm border border-white/10 overflow-hidden">
        <div className="bg-gradient-to-r from-sky-500/15 to-transparent px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-slate-100">📦 Descuentos por Familia</h2>
          <p className="text-xs text-slate-300 mt-1">
            Es el <strong>tope</strong> de cada familia: lo máximo que se puede dar en un pedido.
            Negativo descuenta, positivo aumenta. En el pedido el campo arranca en 0 y se puede
            mejorar hasta acá.
          </p>
        </div>

        <div className="p-6 space-y-3">
          {config.descuentos_familia && Object.entries(config.descuentos_familia).map(([familia, limite]) => {
            const valorTemp = valoresTempDescuentos.hasOwnProperty(familia) ? valoresTempDescuentos[familia] : (limite ?? 0)
            return (
              <div key={familia} className="flex items-center justify-between gap-4 p-4 border border-white/10 rounded-lg">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-100">{etiquetaFamilia(config, familia)}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
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
                    value={valorTemp}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                      setValoresTempDescuentos(prev => ({
                        ...prev,
                        [familia]: val
                      }))
                    }}
                    onBlur={(e) => {
                      const valorGuardado = parseFloat(e.target.value) || 0
                      if (valorGuardado !== limite) {
                        guardarClave(`descuento_${familia}`, { limite: valorGuardado }, '✅ Descuento actualizado')
                      }
                      setValoresTempDescuentos(prev => {
                        const next = { ...prev }
                        delete next[familia]
                        return next
                      })
                    }}
                    disabled={guardando}
                    className={`w-24 px-3 py-2 border rounded-lg text-sm text-right focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      valorTemp < 0
                        ? 'border-green-300 text-emerald-400 focus:ring-green-500'
                        : valorTemp > 0
                          ? 'border-amber-400/50 text-amber-300 bg-amber-500/10 focus:ring-amber-500'
                          : 'border-white/10 focus:ring-[var(--cb-500)]'
                    }`}
                  />
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CONDICIÓN DE PAGO */}
      <section className="tarjeta overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-violet-500/15 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">💳 Condición de pago</h2>
              <p className="text-xs text-slate-300 mt-1">
                Puede descontar o aumentar. <strong>Negativo descuenta, positivo aumenta.</strong>
              </p>
            </div>
            <button
              onClick={() => {
                setNuevaPago({ nombre: '', valor: 0 })
                setMostrarNuevaPago(true)
              }}
              className="shrink-0 w-9 h-9 rounded-lg bg-violet-600 text-white font-bold flex items-center justify-center hover:bg-violet-700 transition"
              title="Agregar nueva condición de pago"
            >
              +
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {config.descuentos_pago && Object.entries(config.descuentos_pago).map(([tipo, valor]) => {
            const esDeFabrica = CONDICIONES_DE_FABRICA.includes(tipo)
            return (
            <div key={tipo} className="flex items-center justify-between gap-4 p-4 border border-white/10 rounded-xl">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-100">
                  {config.etiquetas_pago?.[tipo] || tipo}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
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
                  step="0.5"
                  defaultValue={valor}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value) || 0
                    if (v === valor) return
                    // Las tres de fábrica siguen viviendo bajo 'descuento_';
                    // las que cargó el usuario, bajo 'pago_' y con su nombre.
                    const esDeFabrica = CONDICIONES_DE_FABRICA.includes(tipo)
                    guardarClave(
                      esDeFabrica ? `descuento_${tipo}` : `pago_${tipo}`,
                      esDeFabrica
                        ? { valor: v }
                        : { valor: v, nombre: config.etiquetas_pago?.[tipo] || tipo },
                      '✅ Condición de pago actualizada',
                    )
                  }}
                  disabled={guardando}
                  className={`tabular w-24 px-3 py-2 border rounded-xl text-sm text-right focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    valor < 0
                      ? 'border-emerald-400/50 text-emerald-300 bg-emerald-500/10 focus:ring-emerald-400'
                      : valor > 0
                        ? 'border-amber-400/50 text-amber-300 bg-amber-500/10 focus:ring-amber-400'
                        : 'border-white/10 focus:ring-[var(--cb-500)]'
                  }`}
                />
                <span className="text-sm text-slate-400">%</span>

                {/* Las de fábrica no llevan tachito: no se pueden borrar. */}
                {!esDeFabrica && (
                  <button
                    onClick={() => eliminarCondicionPago(tipo)}
                    disabled={guardando}
                    className="w-9 h-9 rounded-lg border border-white/10 text-slate-400 flex items-center justify-center hover:text-rose-400 hover:border-rose-400/50 hover:bg-rose-500/10 disabled:opacity-50 transition"
                    title={`Eliminar "${config.etiquetas_pago?.[tipo] || tipo}"`}
                    aria-label={`Eliminar la condición de pago ${config.etiquetas_pago?.[tipo] || tipo}`}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </section>

      {/* MODAL PARA AGREGAR NUEVA CONDICIÓN DE PAGO */}
      {mostrarNuevaPago && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-slate-100">Nueva condición de pago</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre (ej: 15 días, Efectivo, Cheque)
                </label>
                <input
                  type="text"
                  value={nuevaPago.nombre}
                  onChange={(e) => setNuevaPago(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ingresa el nombre"
                  className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descuento o recargo (%)
                </label>
                <input
                  type="number"
                  value={nuevaPago.valor === 0 ? '' : nuevaPago.valor}
                  onChange={(e) => setNuevaPago(prev => ({ ...prev, valor: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                  placeholder="-5"
                  step="0.5"
                  className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-slate-400 mt-1">Negativo = descuento, Positivo = recargo</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setMostrarNuevaPago(false)}
                className="px-4 py-2 border border-white/10 rounded-lg text-slate-300 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!nuevaPago.nombre.trim()) {
                    setError('El nombre no puede estar vacío')
                    return
                  }
                  const nombre = nuevaPago.nombre.trim()
                  // La clave viaja en la URL, así que va sin acentos ni espacios.
                  // El nombre con el que se escribió se guarda aparte, para mostrarlo.
                  const clave = nombre
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[̀-ͯ]/g, '')
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, '')
                  await guardarClave(
                    `pago_${clave}`,
                    { valor: nuevaPago.valor, nombre },
                    '✅ Condición de pago agregada',
                  )
                  setMostrarNuevaPago(false)
                  setNuevaPago({ nombre: '', valor: 0 })
                }}
                disabled={guardando || !nuevaPago.nombre.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white font-medium transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
