/**
 * Puente entre la app (en Hostinger) y el Tango de la bulonera.
 *
 * Tango corre en el servidor de la bulonera, dentro de su red, y no se ve
 * desde internet. Un túnel de Cloudflare (cloudflared, instalado como servicio
 * de Windows en ese servidor) lo conecta con Cloudflare sin abrir puertos, y
 * este Worker es la única puerta: recibe las llamadas de la app, verifica la
 * clave del puente y las pasa a Tango por el túnel (binding TANGO, un VPC
 * Service de Workers VPC).
 *
 * Sólo deja pasar las acciones de la API que usa la app. La pantalla web de
 * Tango y todo lo demás del servidor quedan sin exponer.
 *
 * Publicar: npx wrangler deploy (desde esta carpeta)
 * Clave:    npx wrangler secret put CLAVE_PUENTE — la misma que va en
 *           Integraciones → Tango — conexión, en la app.
 */

/** Las acciones de la API de Tango Delta que la app usa (ver api-php/lib/tango_api.php). */
const ACCIONES = new Set(['Get', 'GetById', 'GetByFilter', 'Create', 'GetApiLiveQueryData'])

/** Los únicos headers que siguen viaje hasta Tango. */
const CABECERAS = ['ApiAuthorization', 'Company', 'Content-Type', 'Accept']

/** Compara la clave sin que el tiempo de respuesta delate cuántos caracteres acertó. */
function mismaClave(recibida, esperada) {
  const a = new TextEncoder().encode(recibida)
  const b = new TextEncoder().encode(esperada)
  return a.length === b.length && crypto.subtle.timingSafeEqual(a, b)
}

export default {
  async fetch(request, env) {
    if (!env.CLAVE_PUENTE || !mismaClave(request.headers.get('X-Clave-Puente') || '', env.CLAVE_PUENTE)) {
      return new Response('No autorizado', { status: 401 })
    }

    const url = new URL(request.url)
    const accion = url.pathname.match(/^\/api\/([A-Za-z]+)$/)?.[1]
    if (!accion || !ACCIONES.has(accion)) {
      return new Response('No encontrado', { status: 404 })
    }

    const headers = new Headers()
    for (const nombre of CABECERAS) {
      const valor = request.headers.get(nombre)
      if (valor) headers.set(nombre, valor)
    }

    let respuesta
    try {
      respuesta = await env.TANGO.fetch(`http://servidor:17000/api/${accion}${url.search}`, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      })
    } catch (e) {
      // Lo más común: el servidor de la bulonera está apagado o sin internet,
      // y el túnel no está conectado.
      return Response.json({ message: `No se pudo llegar a Tango por el túnel: ${e.message}` }, { status: 502 })
    }

    return new Response(respuesta.body, {
      status: respuesta.status,
      headers: { 'Content-Type': respuesta.headers.get('Content-Type') || 'application/json' },
    })
  },
}
