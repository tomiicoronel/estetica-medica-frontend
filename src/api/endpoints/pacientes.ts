import { api } from '../client'
import type { PacienteRequest, PacienteResponse } from '../../types/api'

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
