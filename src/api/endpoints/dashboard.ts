import { api, query } from '../client'
import type { DashboardResponse, ResumenDiarioPagoResponse } from '../../types/api'

/** Sin `fecha` usa el día actual en America/Argentina/Buenos_Aires. */
export function getDashboard(fecha?: string): Promise<DashboardResponse> {
  return api.get<DashboardResponse>(`/api/dashboard${query({ fecha })}`)
}

/**
 * Pagos del día y total recaudado. El total sale de acá o del dashboard:
 * nunca de sumar GET /api/pagos, que es el histórico completo.
 */
export function getResumenDiarioPagos(fecha?: string): Promise<ResumenDiarioPagoResponse> {
  return api.get<ResumenDiarioPagoResponse>(`/api/pagos/resumen-diario${query({ fecha })}`)
}
