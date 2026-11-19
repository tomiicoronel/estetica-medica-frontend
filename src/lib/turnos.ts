import type { EstadoTurno } from '../types/api'

/**
 * Same rule as `TurnoService.actualizar`: a REALIZADO appointment stays editable so a
 * mistake made before marking it done (for example, booked without services) can still be
 * fixed and charged. Only a CANCELADO appointment is closed.
 */
export function esTurnoEditable(estado: EstadoTurno): boolean {
  return estado !== 'CANCELADO'
}
