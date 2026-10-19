import type { MetodoPago } from '../types/api'

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
