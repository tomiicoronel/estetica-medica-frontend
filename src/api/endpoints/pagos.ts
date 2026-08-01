import { api, query } from '../client'
import type {
  DiaPagosResumenResponse,
  PageResponse,
  PagoRequest,
  PagoResponse,
  UUID,
} from '../../types/api'

/** Días que tienen pagos, de más reciente a más antiguo. */
export function listarPagosPorDia(): Promise<DiaPagosResumenResponse[]> {
  return api.get<DiaPagosResumenResponse[]>('/api/pagos/por-dia')
}

/** Pagos de un día, paginados. Sin `fecha` pagina el histórico completo. */
export function listarPagosPagina(filtros: {
  page?: number
  size?: number
  fecha?: string
}): Promise<PageResponse<PagoResponse>> {
  return api.get<PageResponse<PagoResponse>>(`/api/pagos/pagina${query({ ...filtros })}`)
}

/**
 * Histórico completo. Se usa sólo para calcular la deuda global, cruzándolo con
 * los turnos; el recaudado de un día sale de `por-dia`, nunca de sumar esto.
 */
export function listarPagos(): Promise<PagoResponse[]> {
  return api.get<PagoResponse[]>('/api/pagos')
}

export function listarPagosDeTurno(turnoId: UUID): Promise<PagoResponse[]> {
  return api.get<PagoResponse[]>(`/api/turnos/${turnoId}/pagos`)
}

/**
 * Admite pagos parciales; el backend rechaza con 400 si el monto supera lo que
 * falta del turno, y exige `detalleTrueque` cuando el método es TRUEQUE.
 */
export function registrarPago(turnoId: UUID, datos: PagoRequest): Promise<PagoResponse> {
  return api.post<PagoResponse>(`/api/turnos/${turnoId}/pagos`, datos)
}

/** El backend lo rechaza si el turno está REALIZADO. */
export function eliminarPago(id: UUID): Promise<void> {
  return api.delete<void>(`/api/pagos/${id}`)
}
