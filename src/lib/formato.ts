import type { EstadoTurno, MetodoPago } from '../types/api'

/**
 * "$ 50.000" para los montos redondos, "$ 19.750,50" cuando hay centavos.
 *
 * El diseño muestra los precios sin decimales y esa es la forma habitual, pero
 * antes se redondeaba siempre y eso llegaba a ocultar deuda: el backend guarda
 * BigDecimal, así que una deuda de $0,40 se mostraba como "$ 0" estando impaga,
 * y un precio de $19.750,50 se leía "$ 19.751" — quien tipeara ese número
 * cobraba de más. Los centavos se muestran sólo cuando existen.
 */
export function formatearMonto(monto: number): string {
  // Redondeo a centavos antes de decidir: la aritmética en coma flotante deja
  // restos (38250.500000000004) que si no harían aparecer decimales de más.
  const valor = Math.round((monto || 0) * 100) / 100
  const decimales = Number.isInteger(valor) ? 0 : 2

  return `$ ${valor.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}`
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
