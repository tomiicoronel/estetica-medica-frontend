import { api } from '../client'
import type {
  EvaluacionMenopausiaRequest,
  EvaluacionMenopausiaResponse,
  UUID,
} from '../../types/api'

/**
 * Evaluaciones de menopausia (escala MRS).
 *
 * A diferencia de las historias clínicas, un paciente puede tener muchas: cada
 * toma es un registro aparte y el objetivo es ver la evolución entre fechas.
 * El listado viene de la más reciente a la más antigua.
 */

export function listarEvaluaciones(pacienteId: UUID): Promise<EvaluacionMenopausiaResponse[]> {
  return api.get<EvaluacionMenopausiaResponse[]>(
    `/api/pacientes/${pacienteId}/evaluaciones-menopausia`,
  )
}

export function crearEvaluacion(
  pacienteId: UUID,
  body: EvaluacionMenopausiaRequest,
): Promise<EvaluacionMenopausiaResponse> {
  return api.post<EvaluacionMenopausiaResponse>(
    `/api/pacientes/${pacienteId}/evaluaciones-menopausia`,
    body,
  )
}

export function actualizarEvaluacion(
  id: UUID,
  body: EvaluacionMenopausiaRequest,
): Promise<EvaluacionMenopausiaResponse> {
  return api.put<EvaluacionMenopausiaResponse>(`/api/evaluaciones-menopausia/${id}`, body)
}

export function eliminarEvaluacion(id: UUID): Promise<void> {
  return api.delete<void>(`/api/evaluaciones-menopausia/${id}`)
}
