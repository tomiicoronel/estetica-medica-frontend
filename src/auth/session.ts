import type { AuthResponse } from '../types/api'

/**
 * Sesión persistida en localStorage.
 *
 * Vive fuera de React a propósito: el cliente HTTP necesita leer el token en
 * cada request y necesita poder cerrar sesión ante un 401 sin depender del
 * árbol de componentes. AuthContext se suscribe a los cambios.
 */

const TOKEN_KEY = 'estetica.token'
const ROL_KEY = 'estetica.rol'
const DEBE_CAMBIAR_KEY = 'estetica.debeCambiarPassword'

export interface Session {
  token: string
  rol: AuthResponse['rol']
  debeCambiarPassword: boolean
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getSession(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const rol = localStorage.getItem(ROL_KEY)

  if (!token || (rol !== 'ADMIN' && rol !== 'PROFESIONAL')) return null

  return {
    token,
    rol,
    debeCambiarPassword: localStorage.getItem(DEBE_CAMBIAR_KEY) === 'true',
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(ROL_KEY, session.rol)
  localStorage.setItem(DEBE_CAMBIAR_KEY, String(session.debeCambiarPassword))
  emit()
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROL_KEY)
  localStorage.removeItem(DEBE_CAMBIAR_KEY)
  emit()
}

/**
 * Tras un 204 de cambiar-password el token actual sigue siendo válido: el
 * backend consulta la base en cada request. Solo hay que bajar el flag.
 */
export function marcarPasswordCambiada(): void {
  localStorage.setItem(DEBE_CAMBIAR_KEY, 'false')
  emit()
}

/* -------------------------------------------------------------------------- */
/* Suscripción                                                                 */
/* -------------------------------------------------------------------------- */

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener)
  // 'storage' cubre el caso de cerrar sesión en otra pestaña.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}
