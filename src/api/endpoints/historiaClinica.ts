import { api } from '../client'
import type {
  HistoriaClinicaCorporalRequest,
  HistoriaClinicaCorporalResponse,
  HistoriaClinicaFacialRequest,
  HistoriaClinicaFacialResponse,
  UUID,
} from '../../types/api'

/**
 * Historia clínica facial y corporal.
 *
 * Son únicas por paciente: el GET devuelve 404 mientras no exista (no es un
 * error, es "todavía no la cargaron") y el POST devuelve 409 si ya está. Por
 * eso la pantalla decide entre POST y PUT según lo que le haya dado el GET.
 */

export function getHistoriaFacial(pacienteId: UUID): Promise<HistoriaClinicaFacialResponse> {
  return api.get<HistoriaClinicaFacialResponse>(
    `/api/pacientes/${pacienteId}/historia-clinica-facial`,
  )
}

export function crearHistoriaFacial(
  pacienteId: UUID,
  body: HistoriaClinicaFacialRequest,
): Promise<HistoriaClinicaFacialResponse> {
  return api.post<HistoriaClinicaFacialResponse>(
    `/api/pacientes/${pacienteId}/historia-clinica-facial`,
    body,
  )
}

export function actualizarHistoriaFacial(
  id: UUID,
  body: HistoriaClinicaFacialRequest,
): Promise<HistoriaClinicaFacialResponse> {
  return api.put<HistoriaClinicaFacialResponse>(`/api/historia-clinica-facial/${id}`, body)
}

export function getHistoriaCorporal(pacienteId: UUID): Promise<HistoriaClinicaCorporalResponse> {
  return api.get<HistoriaClinicaCorporalResponse>(
    `/api/pacientes/${pacienteId}/historia-clinica-corporal`,
  )
}

export function crearHistoriaCorporal(
  pacienteId: UUID,
  body: HistoriaClinicaCorporalRequest,
): Promise<HistoriaClinicaCorporalResponse> {
  return api.post<HistoriaClinicaCorporalResponse>(
    `/api/pacientes/${pacienteId}/historia-clinica-corporal`,
    body,
  )
}

export function actualizarHistoriaCorporal(
  id: UUID,
  body: HistoriaClinicaCorporalRequest,
): Promise<HistoriaClinicaCorporalResponse> {
  return api.put<HistoriaClinicaCorporalResponse>(`/api/historia-clinica-corporal/${id}`, body)
}
