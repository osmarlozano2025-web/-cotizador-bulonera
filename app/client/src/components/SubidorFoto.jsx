import { useState, useRef } from 'react'

/**
 * Pedido por foto.
 *
 * La IA lee la foto y la deja en renglones (producto, medida, cantidad). Cada
 * renglón trae hasta 4 opciones del catálogo de la app o de Tango, con la
 * mejor ya elegida cuando no hay duda. Se revisa, se corrige la cantidad si
 * hace falta y se agrega al pedido.
 */

/** Lo que el pedido necesita de un producto, con números donde Tango no trae precio. */
function productoParaPedido(opcion, cantidad) {
  return {
    ...opcion,
    precioLista: Number(opcion.precioLista) || 0,
    precioGranel: Number(opcion.precioGranel) || 0,
    ivaPorcentaje: opcion.ivaPorcentaje ?? 21,
    cantidad,
  }
}

const pesos = n => '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Los productos que vienen de Tango se guardan en la base de la app (con su
 * precio de lista) antes de entrar al pedido: así el pedido ya los tiene
 * completos y no hay que cargar nada a mano. Devuelve código de Tango -> producto.
 */
async function guardarDeTango(codigos) {
  const token = localStorage.getItem('cb_token')
  const res = await fetch('/api/productos/guardar-de-tango', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ codigos }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `No se pudo guardar desde Tango (${res.status})`)
  }
  return res.json()
}

function Etiqueta({ children, clase }) {
  return <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${clase}`}>{children}</span>
}

export default function SubidorFoto({ onAgregar }) {
  const [archivo, setArchivo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [renglones, setRenglones] = useState([])
  const [tango, setTango] = useState(null)
  const [elegida, setElegida] = useState({})     // renglón -> índice de la opción elegida
  const [cantidades, setCantidades] = useState({}) // renglón -> cantidad
  const [agregados, setAgregados] = useState(new Set())
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  const elegirArchivo = (file) => {
    if (!file) return
    setArchivo(file)
    setPreview(URL.createObjectURL(file))
    setRenglones([])
    setTango(null)
    setElegida({})
    setCantidades({})
    setAgregados(new Set())
    setError('')
  }

  const interpretar = async () => {
    if (!archivo) return
    setCargando(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('imagen', archivo)
      // Leer la foto le cuesta plata a la cuenta de OpenAI: el backend pide sesión.
      const token = localStorage.getItem('cb_token')
      const res = await fetch('/api/productos/interpretar-imagen', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error del servidor (${res.status})`)
      }
      const data = await res.json()
      const items = data.items || []
      setRenglones(items)
      setTango(data.tango || null)
      // Lo que no deja dudas llega ya elegido; el resto lo elige quien revisa.
      const sel = {}
      const cant = {}
      items.forEach((it, i) => {
        if (it.matchExacto) sel[i] = 0
        cant[i] = it.detectado.cantidad || 1
      })
      setElegida(sel)
      setCantidades(cant)
      setAgregados(new Set())
    } catch (e) {
      setError(
        e.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. Probá de nuevo en un momento.'
          : e.message
      )
    } finally {
      setCargando(false)
    }
  }

  // Agrega al pedido los renglones indicados. Los que vienen de Tango se
  // guardan primero en la base, todos juntos en una sola llamada.
  const agregarRenglones = async (indices) => {
    setError('')
    const elegidas = indices
      .map(i => ({ i, opcion: renglones[i]?.sugerencias?.[elegida[i]] }))
      .filter(x => x.opcion)
    if (!elegidas.length) return

    let guardados = {}
    const deTango = [...new Set(elegidas.filter(x => x.opcion.origen === 'tango').map(x => x.opcion.codigo))]
    if (deTango.length) {
      setGuardando(true)
      try {
        guardados = await guardarDeTango(deTango)
      } catch (e) {
        setError(e.message)
        setGuardando(false)
        return
      }
      setGuardando(false)
    }

    const hechos = []
    for (const { i, opcion } of elegidas) {
      const producto = opcion.origen === 'tango' ? guardados[opcion.codigo] : opcion
      if (!producto) { setError(`No se pudo guardar ${opcion.codigo} desde Tango.`); continue }
      onAgregar(productoParaPedido(producto, Number(cantidades[i]) || 1))
      hechos.push(i)
    }
    setAgregados(prev => new Set([...prev, ...hechos]))
  }

  const agregarRenglon = (i) => agregarRenglones([i])
  const listos = renglones.map((_, i) => i).filter(i => elegida[i] !== undefined && !agregados.has(i))
  const agregarListos = () => agregarRenglones(listos)
  const sinOpciones = renglones.filter(it => !it.sugerencias?.length).length

  return (
    <div className="space-y-4">
      {!preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-amber-500/30 rounded-xl p-8 text-center bg-amber-500/10 hover:bg-amber-500/20 transition"
        >
          <div className="text-4xl mb-3">📷</div>
          <p className="font-semibold text-amber-400 text-sm">Subir foto del pedido</p>
          <p className="text-xs text-amber-400 mt-1">Manuscrito, impreso o captura: se interpreta automáticamente</p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => elegirArchivo(e.target.files?.[0])}
      />

      {preview && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <img src={preview} alt="Vista previa" className="w-32 h-32 object-cover rounded-lg border" />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-300">{archivo.name}</p>
              <div className="flex gap-2">
                <button
                  onClick={interpretar}
                  disabled={cargando}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {cargando ? 'Leyendo la foto…' : renglones.length ? 'Volver a leer' : 'Interpretar pedido'}
                </button>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="text-sm text-slate-400 hover:text-slate-200 px-3 py-2"
                >
                  Cambiar foto
                </button>
              </div>
              {cargando && (
                <p className="text-xs text-slate-400 animate-pulse">
                  Leyendo el pedido y buscando cada producto en el catálogo y en Tango. Puede tardar hasta un minuto.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          {renglones.length === 0 && !cargando && preview && archivo && !error && tango && (
            <p className="text-xs text-slate-400">No se encontró ningún producto en la foto.</p>
          )}

          {renglones.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="text-slate-300">
                  <span className="font-semibold">{renglones.length}</span> renglones leídos
                  {' · '}<span className="text-emerald-400">{Object.keys(elegida).length} listos</span>
                  {' · '}<span className="text-amber-400">{renglones.length - Object.keys(elegida).length - sinOpciones} para elegir</span>
                  {sinOpciones > 0 && <> · <span className="text-rose-400">{sinOpciones} sin opciones</span></>}
                </p>
                <button
                  onClick={agregarListos}
                  disabled={listos.length === 0 || guardando}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  {guardando ? 'Guardando…' : `Agregar los ${listos.length} listos`}
                </button>
              </div>

              {tango && (!tango.disponible || tango.mensaje) && (
                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  {tango.mensaje || 'No se pudo consultar Tango: sólo se muestran productos que ya están en la app.'}
                </p>
              )}

              <ul className="border rounded-lg overflow-hidden divide-y divide-white/5">
                {renglones.map((item, i) => {
                  const d = item.detectado
                  const ya = agregados.has(i)
                  return (
                    <li key={i} className={`px-4 py-3 ${ya ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {d.producto} {d.medida && <span className="text-amber-300">· {d.medida}</span>}
                            {d.dudoso && <Etiqueta clase="ml-2 bg-rose-500/20 text-rose-300">revisar lectura</Etiqueta>}
                          </p>
                          {d.original && d.original !== d.descripcion && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">En la foto: {d.original}</p>
                          )}
                        </div>
                        <label className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                          Cant.
                          <input
                            type="number"
                            min="1"
                            value={cantidades[i] ?? ''}
                            onChange={e => setCantidades(c => ({ ...c, [i]: e.target.value }))}
                            disabled={ya}
                            className="w-20 border rounded px-2 py-1 text-sm text-right bg-white/5"
                          />
                        </label>
                      </div>

                      {item.sugerencias.length === 0 ? (
                        <p className="text-xs text-slate-400 mt-1.5">Sin coincidencias en el catálogo ni en Tango. Buscalo a mano.</p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {item.sugerencias.map((s, k) => {
                            const activa = elegida[i] === k
                            return (
                              <button
                                key={`${s.origen}-${s.codigo}-${k}`}
                                type="button"
                                disabled={ya}
                                onClick={() => setElegida(e => ({ ...e, [i]: k }))}
                                className={`w-full text-left text-xs rounded border px-2.5 py-1.5 flex items-center gap-2 transition ${
                                  activa
                                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                                    : s.medidaCoincide
                                      ? 'bg-sky-500/10 border-sky-500/20 text-sky-300 hover:bg-sky-500/20'
                                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                }`}
                              >
                                <span className={`w-3 h-3 rounded-full border shrink-0 ${activa ? 'bg-emerald-400 border-emerald-300' : 'border-slate-500'}`} />
                                <span className="codigo shrink-0">{s.codigo}</span>
                                <span className="truncate">{s.descripcion}{s.medida ? ` · ${s.medida}` : ''}</span>
                                <span className="ml-auto flex items-center gap-1 shrink-0">
                                  {Number(s.precioLista) > 0 && <span className="text-slate-300 font-medium">{pesos(s.precioLista)}</span>}
                                  {s.origen === 'tango' && <Etiqueta clase="bg-violet-500/20 text-violet-300">Tango</Etiqueta>}
                                  {s.medidaAproximada && <Etiqueta clase="bg-amber-500/20 text-amber-300">medida aprox.</Etiqueta>}
                                  {!s.medidaCoincide && <Etiqueta clase="bg-amber-500/20 text-amber-300">otra medida</Etiqueta>}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {item.sugerencias.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => agregarRenglon(i)}
                            disabled={ya || guardando || elegida[i] === undefined}
                            className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded px-3 py-1 transition"
                          >
                            {ya ? '✓ Agregado' : elegida[i] === undefined ? 'Elegí una opción' : '+ Agregar al pedido'}
                          </button>
                          {elegida[i] !== undefined && item.sugerencias[elegida[i]]?.origen === 'tango'
                            && !Number(item.sugerencias[elegida[i]]?.precioLista) && !ya && (
                            <span className="text-[11px] text-amber-300">Tango no tiene precio para este artículo en la lista de venta.</span>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
