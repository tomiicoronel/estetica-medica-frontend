import type { EstadoTurno, MetodoPago } from '../types/api'

/** Formato del diseño: "$ 50.000", sin decimales. */
export function formatearMonto(monto: number): string {
  return `$ ${Math.round(monto || 0).toLocaleString('es-AR')}`
}

/**
 * "2026-06-01T14:30:00" → "14:30".
 *
 * `hour12: false` explícito: es-AR formatea en 12 horas y devolvía
 * "02:30 p. m.", que además choca con el "hs" que le sigue en pantalla.
 */
export function formatearHora(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** "jueves 5 de junio" */
export function formatearFechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Los `?fecha=` del backend van en yyyy-MM-dd, en hora local. */
export function aFechaISO(fecha: Date): string {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/**
 * Un opcional que la profesional nunca cargó vuelve como `null`, no ausente:
 * Jackson serializa la propiedad igual. Por eso `?? '—'` no alcanza para
 * decidir si un campo tiene dato.
 */
export function cargado(valor: string | undefined | null): valor is string {
  return typeof valor === 'string' && valor.trim() !== ''
}

export function oGuion(valor: string | undefined | null): string {
  return cargado(valor) ? valor : '—'
}

/** Une con " · " las partes que sí tienen dato; si no queda ninguna, un guión. */
export function unir(partes: (string | undefined | null)[]): string {
  const cargadas = partes.filter(cargado)
  return cargadas.length === 0 ? '—' : cargadas.join(' · ')
}

export const ETIQUETA_ESTADO: Record<EstadoTurno, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
}

export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  TRUEQUE: 'Trueque',
}
