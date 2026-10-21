/**
 * Los roles de mando, igual que ROLES_ADMIN en el backend (api-php/lib/auth.php).
 *
 * Existe para que un rol nuevo no obligue a buscar comparaciones sueltas por
 * toda la app: cuando se agregó SuperAdmin, la pantalla de Configuraciones
 * seguía preguntando por 'Administrador' y dejaba afuera al super admin.
 */
export const ROLES_ADMIN = ['SuperAdmin', 'Administrador']

export const esAdmin = (user) => ROLES_ADMIN.includes(user?.rol)

export const esSuperAdmin = (user) => user?.rol === 'SuperAdmin'

/**
 * Ve todo, no toca nada. Es un tilde sobre la persona, no un rol aparte.
 *
 * Quien manda es el backend: corta cualquier escritura en requireAuth()
 * (api-php/lib/auth.php). Esto es para que la pantalla lo avise antes, en vez
 * de dejar apretar un botón que va a volver con un error.
 */
export const esSoloLectura = (user) => !!user?.permisos?.soloLectura
