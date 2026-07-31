import { api } from '../client'
import type { PacienteResponse } from '../../types/api'

/**
 * Lista completa. Para pantallas de listado usar la variante paginada
 * (`/api/pacientes/pagina`); ésta sirve para resolver nombres por id, porque
 * TurnoResponse solo trae `pacienteId`.
 */
export function listarPacientes(): Promise<PacienteResponse[]> {
  return api.get<PacienteResponse[]>('/api/pacientes')
}
