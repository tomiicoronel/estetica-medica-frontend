import { api } from '../client'
import type { ProfesionalRequest, ProfesionalResponse } from '../../types/api'

/** GET /api/profesionales/me — perfil propio (también para el ADMIN). */
export function getPerfil(): Promise<ProfesionalResponse> {
  return api.get<ProfesionalResponse>('/api/profesionales/me')
}

/** PUT /api/profesionales/me */
export function actualizarPerfil(body: ProfesionalRequest): Promise<ProfesionalResponse> {
  return api.put<ProfesionalResponse>('/api/profesionales/me', body)
}
