# Puente app → Tango (Cloudflare, gratis)

```
App en Hostinger ──► Worker "puente-tango-bulonera" (workers.dev, pide la clave del puente)
                         └──► VPC Service "tango-bulonera" ──► túnel "bulonera-tango"
                                                                 └──► servidor de la bulonera ──► Tango :17000
```

- **No se tocó el DNS de `nazarenolozano.de`** ni hizo falta un dominio: el Worker vive en
  `https://puente-tango-bulonera.osmar-lozano-2025.workers.dev`.
- **Tango no queda expuesto a internet.** El túnel sale desde el servidor hacia Cloudflare (no se abren
  puertos) y la única puerta es el Worker, que exige la clave del puente y sólo deja pasar las acciones
  de la API que usa la app (Get, GetById, GetByFilter, Create, GetApiLiveQueryData).
- Todo es del plan gratis (Workers VPC está en beta y es gratis en todos los planes).

## Qué hay creado (21/10/2026)

| Pieza | Dónde | Dato |
|---|---|---|
| Worker | `app/puente-tango/` (`npx wrangler deploy`) | `puente-tango-bulonera` |
| Clave del puente | Secreto `CLAVE_PUENTE` del Worker y `config.tangoClavePuente` en la app | copia en `respaldos/credenciales.txt` |
| VPC Service | Cloudflare → Workers VPC | `tango-bulonera` · `01a15e97-9434-71f0-921a-4e96121790ed` · 127.0.0.1:17000 |
| Túnel | Cloudflare → Workers VPC → Tunnels | `bulonera-tango` · `b40e60f4-8d44-4299-bb99-9a1d677cf69d` |
| Instalador del túnel | `respaldos/instalar-puente-tango.cmd` (tiene la llave; no va a git) | |
| App | Integraciones → Tango — conexión | dirección, empresa 7 y clave ya cargadas |

## Instalarlo en el servidor (una sola vez, por AnyDesk)

1. Pasar `respaldos/instalar-puente-tango.cmd` al servidor de la bulonera (transferencia de archivos de AnyDesk).
2. Clic derecho → **Ejecutar como administrador**. El script prueba que Tango responda en el puerto
   17000, baja `cloudflared` (oficial de Cloudflare) a `C:\cloudflared` y lo instala como servicio.
3. Cerrar AnyDesk. El servicio arranca solo con Windows.

Si el instalador se corre en otra PC que no sea el servidor, hay que cambiar el VPC Service para que
apunte a la IP del servidor en lugar de 127.0.0.1:
`npx wrangler vpc service update 01a15e97-9434-71f0-921a-4e96121790ed --ipv4 <IP del servidor> --http-port 17000`

Workers VPC necesita que el túnel salga por QUIC (UDP 7844). Si el firewall del local lo bloquea, el
túnel cae a HTTP/2 y puede fallar: en ese caso, permitir salida UDP 7844.

## Probar

- Desde la app: Integraciones → **Probar conexión** (necesita el token de Tango cargado).
- Sin la clave, el Worker responde 401; con la clave y el túnel apagado, 502 "destination_unavailable".

## Mantenimiento

Ninguno de rutina. Si el servidor está apagado o sin internet, la app no llega a Tango hasta que vuelva.
Para cambiar la clave: `npx wrangler secret put CLAVE_PUENTE` en `app/puente-tango` y la misma en
Integraciones.
