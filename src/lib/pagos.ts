import type { MetodoPago } from '../types/api'
import { formatearMonto } from './formato'

/**
 * CANJE y SIN_CARGO saldan la deuda del turno pero no son dinero cobrado:
 * no entran en recaudación ni en totales de pagos.
 */
export function esMetodoExento(metodo: MetodoPago): boolean {
  return metodo === 'CANJE' || metodo === 'SIN_CARGO'
}

interface PagoSumable {
  metodo: MetodoPago
  monto: number
}

/** Suma solo el dinero realmente cobrado (excluye CANJE y SIN_CARGO). */
export function sumarCobrado(pagos: readonly PagoSumable[]): number {
  return pagos.reduce((total, p) => (esMetodoExento(p.metodo) ? total : total + p.monto), 0)
}

/** Suma lo cubierto sin cobro (solo CANJE y SIN_CARGO). */
export function sumarCubiertoSinCobro(pagos: readonly PagoSumable[]): number {
  return pagos.reduce((total, p) => (esMetodoExento(p.metodo) ? total + p.monto : total), 0)
}

const METODOS_DINERO: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO']

/**
 * Métodos que se pueden elegir según la deuda del turno. CANJE y SIN_CARGO saldan
 * exactamente la deuda restante, así que sin deuda no tienen sentido (el backend
 * los rechaza).
 */
export function metodosDisponibles(deuda: number): MetodoPago[] {
  return deuda > 0 ? [...METODOS_DINERO, 'CANJE', 'SIN_CARGO'] : METODOS_DINERO
}

/**
 * Un turno sin servicios todavía no tiene precio, pero puede recibir una seña
 * para reservar. Con servicios, solo se ofrece pagar mientras quede deuda.
 */
export function puedeRegistrarPago(
  resumen: { tieneDeuda: boolean },
  cantidadServicios: number,
): boolean {
  return resumen.tieneDeuda || cantidadServicios === 0
}

/**
 * Devuelve el mensaje de error si el monto supera la deuda, o null si es válido.
 * Sin servicios no hay tope: lo pagado de más queda como saldo a favor.
 */
export function validarMontoContraDeuda(
  monto: number,
  deuda: number,
  sinServicios: boolean,
): string | null {
  if (sinServicios || monto <= deuda) return null
  return `El monto no puede superar la deuda del turno (${formatearMonto(deuda)}).`
}
