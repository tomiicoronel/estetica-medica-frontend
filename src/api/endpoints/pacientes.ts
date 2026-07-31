import { api, apiTexto, query } from '../client'
import type { PacienteRequest, PacienteResponse, UUID } from '../../types/api'

/**
 * Lista completa (activos y archivados).
 *
 * Existe además `/api/pacientes/pagina`, pero no acepta término de búsqueda: si
 * pagináramos en el servidor, el buscador solo encontraría lo que ya está en la
 * página visible. La pantalla trae la lista entera y filtra/pagina de este lado.
 */
export function listarPacientes(): Promise<PacienteResponse[]> {
  return api.get<PacienteResponse[]>('/api/pacientes')
}

export function crearPaciente(datos: PacienteRequest): Promise<PacienteResponse> {
  return api.post<PacienteResponse>('/api/pacientes', datos)
}

/** Un paciente de otra profesional responde 404, no 403: el backend es multi-tenant. */
export function getPaciente(id: UUID): Promise<PacienteResponse> {
  return api.get<PacienteResponse>(`/api/pacientes/${id}`)
}

export function actualizarPaciente(id: UUID, datos: PacienteRequest): Promise<PacienteResponse> {
  return api.put<PacienteResponse>(`/api/pacientes/${id}`, datos)
}

/**
 * Baja y alta lógica. Conserva todo el historial clínico; el borrado físico es
 * otro endpoint y solo funciona con pacientes sin ningún dato asociado.
 */
export function cambiarEstadoPaciente(id: UUID, activo: boolean): Promise<string> {
  return apiTexto(`/api/pacientes/${id}/estado${query({ activo })}`, { method: 'PATCH' })
}
