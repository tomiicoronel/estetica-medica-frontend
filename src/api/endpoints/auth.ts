import { api } from '../client'
import type { AuthResponse, CambioPasswordRequest, LoginRequest } from '../../types/api'

/** POST /api/auth/login — público. */
export function login(body: LoginRequest): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/login', body)
}

/** POST /api/auth/cambiar-password — 204. Habilitado aun con debeCambiarPassword=true. */
export function cambiarPassword(body: CambioPasswordRequest): Promise<void> {
  return api.post<void>('/api/auth/cambiar-password', body)
}
