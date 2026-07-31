import type { AuthResponse } from '../types/api'

/** Pantalla de inicio de cada rol. */
export function inicioSegunRol(rol: AuthResponse['rol']): string {
  return rol === 'ADMIN' ? '/admin/cuentas' : '/dashboard'
}
