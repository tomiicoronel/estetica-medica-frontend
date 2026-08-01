import { api } from '../client'
import type { BloqueoAgendaRequest, BloqueoAgendaResponse, UUID } from '../../types/api'

/**
 * Bloqueos de agenda: rangos en los que la profesional no atiende.
 *
 * `fechaInicio` no puede estar en el pasado (`@FutureOrPresent`), así que sólo
 * se cargan bloqueos a futuro.
 */

export function listarBloqueos(): Promise<BloqueoAgendaResponse[]> {
  return api.get<BloqueoAgendaResponse[]>('/api/bloqueos-agenda')
}

export function crearBloqueo(body: BloqueoAgendaRequest): Promise<BloqueoAgendaResponse> {
  return api.post<BloqueoAgendaResponse>('/api/bloqueos-agenda', body)
}

export function actualizarBloqueo(
  id: UUID,
  body: BloqueoAgendaRequest,
): Promise<BloqueoAgendaResponse> {
  return api.put<BloqueoAgendaResponse>(`/api/bloqueos-agenda/${id}`, body)
}

export function eliminarBloqueo(id: UUID): Promise<void> {
  return api.delete<void>(`/api/bloqueos-agenda/${id}`)
}
