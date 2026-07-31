import { api, query } from '../client'
import type {
  EstadoTurno,
  PageResponse,
  ResumenPagoResponse,
  TurnoRequest,
  TurnoResponse,
  UUID,
} from '../../types/api'

/**
 * Todos los turnos del día indicado, sin límite de cantidad.
 * Sin `fecha` devuelve los del próximo día que tenga turnos, o [] si no hay.
 */
export function getTurnosProximos(fecha?: string): Promise<TurnoResponse[]> {
  return api.get<TurnoResponse[]>(`/api/turnos/proximos${query({ fecha })}`)
}

interface FiltrosTurnos {
  page?: number
  size?: number
  estado?: EstadoTurno
  /** `yyyy-MM-dd`. Si va, el backend ignora desde/hasta. */
  fecha?: string
}

/**
 * Agenda paginada, ordenada por fechaHora descendente.
 *
 * Acá se pagina del lado del servidor, al revés que en pacientes: los filtros
 * de esta pantalla (estado y día) son justo los que el endpoint acepta, así que
 * no hace falta traer todo para filtrar.
 */
export function listarTurnosPagina(filtros: FiltrosTurnos): Promise<PageResponse<TurnoResponse>> {
  return api.get<PageResponse<TurnoResponse>>(`/api/turnos/pagina${query({ ...filtros })}`)
}

/** Historial completo de un paciente, del más nuevo al más viejo. */
export function listarTurnosDePaciente(pacienteId: UUID): Promise<TurnoResponse[]> {
  return api.get<TurnoResponse[]>(`/api/pacientes/${pacienteId}/turnos`)
}

/** Congela el precio de cada servicio al momento de crearlo. */
export function crearTurno(datos: TurnoRequest): Promise<TurnoResponse> {
  return api.post<TurnoResponse>('/api/turnos', datos)
}

export function cambiarEstadoTurno(id: UUID, nuevoEstado: EstadoTurno): Promise<TurnoResponse> {
  return api.patch<TurnoResponse>(`/api/turnos/${id}/estado${query({ nuevoEstado })}`)
}

/** Total, pagado y deuda de un turno. */
export function getResumenPagosTurno(turnoId: UUID): Promise<ResumenPagoResponse> {
  return api.get<ResumenPagoResponse>(`/api/turnos/${turnoId}/pagos/resumen`)
}
