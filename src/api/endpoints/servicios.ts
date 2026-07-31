import { api, apiTexto, query } from '../client'
import type { ServicioRequest, ServicioResponse, UUID } from '../../types/api'

/** Activos y desactivados. No hay borrado físico de servicios. */
export function listarServicios(): Promise<ServicioResponse[]> {
  return api.get<ServicioResponse[]>('/api/servicios')
}

/** Los únicos que se pueden cargar en un turno nuevo. */
export function listarServiciosActivos(): Promise<ServicioResponse[]> {
  return api.get<ServicioResponse[]>('/api/servicios/activos')
}

/**
 * Ojo con `descripcion`: la guía la documenta opcional pero el backend la
 * valida con `@NotBlank` (ServicioRequest), así que omitirla devuelve 400.
 * El formulario la pide como obligatoria.
 */
export function crearServicio(datos: ServicioRequest): Promise<ServicioResponse> {
  return api.post<ServicioResponse>('/api/servicios', datos)
}

/**
 * Actualiza nombre, descripción y precio de una. Los turnos ya agendados no se
 * tocan: guardan su propio `precioMomento` en cada `TurnoServicio`.
 */
export function actualizarServicio(id: UUID, datos: ServicioRequest): Promise<ServicioResponse> {
  return api.put<ServicioResponse>(`/api/servicios/${id}`, datos)
}

/** Baja lógica. Un servicio desactivado sigue en el historial de turnos. */
export function cambiarEstadoServicio(id: UUID, activo: boolean): Promise<string> {
  return apiTexto(`/api/servicios/${id}/estado${query({ activo })}`, { method: 'PATCH' })
}
