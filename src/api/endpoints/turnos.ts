import { api, query } from '../client'
import type { ResumenPagoResponse, TurnoResponse, UUID } from '../../types/api'

/**
 * Todos los turnos del día indicado, sin límite de cantidad.
 * Sin `fecha` devuelve los del próximo día que tenga turnos, o [] si no hay.
 */
export function getTurnosProximos(fecha?: string): Promise<TurnoResponse[]> {
  return api.get<TurnoResponse[]>(`/api/turnos/proximos${query({ fecha })}`)
}

/** Total, pagado y deuda de un turno. */
export function getResumenPagosTurno(turnoId: UUID): Promise<ResumenPagoResponse> {
  return api.get<ResumenPagoResponse>(`/api/turnos/${turnoId}/pagos/resumen`)
}
