import { api } from '../client'
import type { SesionClinicaRequest, SesionClinicaResponse, UUID } from '../../types/api'

/**
 * Sesión de un turno. Responde 404 si el turno todavía no tiene una: es el
 * caso normal, no un error, así que quien lo use tiene que distinguirlo.
 */
export function getSesionDeTurno(turnoId: UUID): Promise<SesionClinicaResponse> {
  return api.get<SesionClinicaResponse>(`/api/turnos/${turnoId}/sesion-clinica`)
}

export function listarSesionesDePaciente(pacienteId: UUID): Promise<SesionClinicaResponse[]> {
  return api.get<SesionClinicaResponse[]>(`/api/pacientes/${pacienteId}/sesiones-clinicas`)
}

/**
 * El backend sólo la acepta si el turno está REALIZADO y todavía no tiene
 * sesión; el `numeroSesion` lo calcula él contando las del paciente.
 *
 * Ojo con `respuestaTolerancia`: la guía la documenta opcional pero
 * SesionClinicaRequest la valida `@NotBlank`.
 */
export function crearSesion(
  turnoId: UUID,
  datos: SesionClinicaRequest,
): Promise<SesionClinicaResponse> {
  return api.post<SesionClinicaResponse>(`/api/turnos/${turnoId}/sesion-clinica`, datos)
}

export function actualizarSesion(
  id: UUID,
  datos: SesionClinicaRequest,
): Promise<SesionClinicaResponse> {
  return api.put<SesionClinicaResponse>(`/api/sesiones-clinicas/${id}`, datos)
}
