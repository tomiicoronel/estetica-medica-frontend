import { api } from '../client'
import type {
  CrearProfesionalRequest,
  EditarProfesionalRequest,
  ProfesionalResponse,
  ResetearPasswordRequest,
  UUID,
} from '../../types/api'

/** Todos requieren rol ADMIN: el backend responde 403 a cuentas PROFESIONAL. */

export function listarProfesionales(): Promise<ProfesionalResponse[]> {
  return api.get<ProfesionalResponse[]>('/api/admin/profesionales')
}

/** El backend siempre asigna rol PROFESIONAL y debeCambiarPassword=true. */
export function crearProfesional(body: CrearProfesionalRequest): Promise<ProfesionalResponse> {
  return api.post<ProfesionalResponse>('/api/admin/profesionales', body)
}

/** No modifica rol, password ni debeCambiarPassword. */
export function editarProfesional(
  id: UUID,
  body: EditarProfesionalRequest,
): Promise<ProfesionalResponse> {
  return api.put<ProfesionalResponse>(`/api/admin/profesionales/${id}`, body)
}

/** Deja la cuenta con debeCambiarPassword=true otra vez. */
export function resetearPassword(id: UUID, body: ResetearPasswordRequest): Promise<void> {
  return api.post<void>(`/api/admin/profesionales/${id}/resetear-password`, body)
}

export function eliminarProfesional(id: UUID): Promise<void> {
  return api.delete<void>(`/api/admin/profesionales/${id}`)
}
