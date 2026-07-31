import { createContext } from 'react'
import type { AuthResponse, LoginRequest, ProfesionalResponse } from '../types/api'
import type { Session } from './session'

export interface AuthContextValue {
  /** null = no hay sesión. */
  session: Session | null
  /** Perfil de `/api/profesionales/me`. Undefined mientras carga o si no aplica. */
  perfil: ProfesionalResponse | undefined
  login: (credenciales: LoginRequest) => Promise<AuthResponse>
  logout: () => void
  /** Llamar tras el 204 de cambiar-password: baja el flag sin re-loguear. */
  confirmarCambioPassword: () => void
}

/** El contexto solo se consume vía useAuth, que valida que exista el provider. */
export const AuthContext = createContext<AuthContextValue | null>(null)
