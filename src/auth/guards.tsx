import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { AuthResponse } from '../types/api'
import { inicioSegunRol } from './rutas'
import { useAuth } from './useAuth'

/**
 * Rutas privadas.
 * El orden de las comprobaciones replica la decisión post-login de la guía:
 * debeCambiarPassword gana sobre todo lo demás (el backend bloquea el resto
 * de los endpoints igual, así que no tiene sentido dejar entrar).
 */
export function RequireAuth() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    // Guardamos de dónde venía para volver ahí después del login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (session.debeCambiarPassword) {
    return <Navigate to="/cambiar-password" replace />
  }

  return <Outlet />
}

/** Solo accesible mientras la contraseña inicial siga sin cambiarse. */
export function RequireCambioPassword() {
  const { session } = useAuth()

  if (!session) return <Navigate to="/login" replace />
  if (!session.debeCambiarPassword) return <Navigate to={inicioSegunRol(session.rol)} replace />

  return <Outlet />
}

/**
 * Filtro por rol. Es solo UX: el backend responde 403 igual si una cuenta
 * PROFESIONAL golpea /api/admin/**.
 */
export function RequireRol({ rol }: { rol: AuthResponse['rol'] }) {
  const { session } = useAuth()

  if (!session) return <Navigate to="/login" replace />
  if (session.rol !== rol) return <Navigate to={inicioSegunRol(session.rol)} replace />

  return <Outlet />
}

/** Redirige a quien ya tiene sesión fuera de /login. */
export function RedirectSiAutenticado() {
  const { session } = useAuth()

  if (!session) return <Outlet />
  if (session.debeCambiarPassword) return <Navigate to="/cambiar-password" replace />

  return <Navigate to={inicioSegunRol(session.rol)} replace />
}
