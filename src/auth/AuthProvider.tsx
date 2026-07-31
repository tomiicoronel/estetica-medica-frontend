import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { login as loginRequest } from '../api/endpoints/auth'
import { getPerfil } from '../api/endpoints/profesionales'
import type { LoginRequest } from '../types/api'
import { AuthContext, type AuthContextValue } from './authContext'
import {
  clearSession,
  getSession,
  marcarPasswordCambiada,
  saveSession,
  subscribeSession,
  type Session,
} from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Estado inicial leído de localStorage: al refrescar, la sesión sobrevive.
  const [session, setSession] = useState<Session | null>(() => getSession())
  const queryClient = useQueryClient()

  // El cliente HTTP puede limpiar la sesión solo (401). Nos enteramos por acá.
  useEffect(() => subscribeSession(() => setSession(getSession())), [])

  // El login solo devuelve token + rol; el nombre para el sidebar sale de /me.
  // Mientras debeCambiarPassword esté en true el backend bloquea este endpoint.
  const { data: perfil } = useQuery({
    queryKey: ['perfil'],
    queryFn: getPerfil,
    enabled: session !== null && !session.debeCambiarPassword,
    staleTime: 5 * 60 * 1000,
  })

  const login = useCallback(async (credenciales: LoginRequest) => {
    const respuesta = await loginRequest(credenciales)
    saveSession({
      token: respuesta.token,
      rol: respuesta.rol,
      debeCambiarPassword: respuesta.debeCambiarPassword,
    })
    return respuesta
  }, [])

  const logout = useCallback(() => {
    clearSession()
    // Sin esto, la próxima sesión vería datos cacheados de la anterior.
    queryClient.clear()
  }, [queryClient])

  const confirmarCambioPassword = useCallback(() => {
    marcarPasswordCambiada()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, perfil, login, logout, confirmarCambioPassword }),
    [session, perfil, login, logout, confirmarCambioPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
