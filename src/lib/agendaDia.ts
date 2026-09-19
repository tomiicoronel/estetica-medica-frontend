/**
 * Pure layout helpers for the day-view agenda on the dashboard.
 * Everything is derived from `LocalDateTime` strings (parsed as local time,
 * see `fecha.ts`) so the JSX only has to apply the returned numbers.
 */

export interface RangoHoras {
  /** First visible hour (0-23). */
  horaInicio: number
  /** Last visible hour, exclusive (1-24). */
  horaFin: number
}

export interface TurnoConHorario {
  fechaHora: string
  fechaHoraFin: string
}

export interface Posicion {
  top: number
  height: number
}

export interface Columna {
  columna: number
  total: number
}

export const HORA_INICIO_POR_DEFECTO = 8
export const HORA_FIN_POR_DEFECTO = 18
/** Keeps zero-length or very short appointments visible and clickable. */
export const ALTO_MINIMO_BLOQUE = 24

const MINUTOS_POR_HORA = 60
const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA

/** Minutes since the local midnight of `fecha`. */
function minutosDesdeMedianoche(fecha: Date): number {
  return fecha.getHours() * MINUTOS_POR_HORA + fecha.getMinutes()
}

/**
 * Whole-hour range that contains every valid appointment, never narrower than
 * 08:00-18:00. Appointments crossing midnight cap the range at 24.
 */
export function rangoHorasVisibles(turnos: TurnoConHorario[]): RangoHoras {
  let horaInicio = HORA_INICIO_POR_DEFECTO
  let horaFin = HORA_FIN_POR_DEFECTO

  for (const turno of turnos) {
    const inicio = new Date(turno.fechaHora)
    const fin = new Date(turno.fechaHoraFin)
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) continue

    const minutosInicio = minutosDesdeMedianoche(inicio)
    const minutosFin = minutosInicio + Math.max(0, (fin.getTime() - inicio.getTime()) / 60000)

    horaInicio = Math.min(horaInicio, Math.floor(minutosInicio / MINUTOS_POR_HORA))
    horaFin = Math.max(horaFin, Math.ceil(Math.min(minutosFin, MINUTOS_POR_DIA) / MINUTOS_POR_HORA))
  }

  return { horaInicio, horaFin }
}

/**
 * Vertical placement (px) of an appointment inside the visible range.
 * Clips to the range, enforces a minimum height and returns `null` when the
 * appointment is entirely outside the range or has invalid dates.
 */
export function posicionBloque(
  fechaHora: string,
  fechaHoraFin: string,
  rango: RangoHoras,
  alturaHora: number,
): Posicion | null {
  const inicio = new Date(fechaHora)
  const fin = new Date(fechaHoraFin)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null

  const minutosInicio = minutosDesdeMedianoche(inicio)
  const minutosFin = minutosInicio + Math.max(0, (fin.getTime() - inicio.getTime()) / 60000)
  const desde = rango.horaInicio * MINUTOS_POR_HORA
  const hasta = rango.horaFin * MINUTOS_POR_HORA

  if (minutosFin <= desde && minutosInicio < desde) return null
  if (minutosInicio >= hasta) return null

  const porMinuto = alturaHora / MINUTOS_POR_HORA
  const top = (Math.max(minutosInicio, desde) - desde) * porMinuto
  const bottom = (Math.min(minutosFin, hasta) - desde) * porMinuto
  const tope = (hasta - desde) * porMinuto

  const height = Math.max(bottom - top, ALTO_MINIMO_BLOQUE)
  // A minimum-height block near the bottom must not overflow the timeline.
  return { top: Math.min(top, Math.max(tope - height, 0)), height }
}

/** Offset (px) of the "now" line, or `null` when `ahora` is outside the range. */
export function desplazamientoAhora(
  ahora: Date,
  rango: RangoHoras,
  alturaHora: number,
): number | null {
  const minutos = minutosDesdeMedianoche(ahora)
  const desde = rango.horaInicio * MINUTOS_POR_HORA
  const hasta = rango.horaFin * MINUTOS_POR_HORA
  if (minutos < desde || minutos >= hasta) return null
  return ((minutos - desde) * alturaHora) / MINUTOS_POR_HORA
}

/**
 * Side-by-side columns for overlapping blocks (minutes since midnight).
 * Results keep the input order; non-overlapping clusters stay full width.
 */
export function asignarColumnas(bloques: { inicio: number; fin: number }[]): Columna[] {
  const resultado: Columna[] = bloques.map(() => ({ columna: 0, total: 1 }))
  const orden = bloques.map((_, i) => i).sort((a, b) => bloques[a].inicio - bloques[b].inicio)

  let cluster: number[] = []
  let finDeColumna: number[] = []
  let finDelCluster = -Infinity

  const cerrarCluster = () => {
    for (const i of cluster) resultado[i].total = finDeColumna.length
    cluster = []
    finDeColumna = []
  }

  for (const i of orden) {
    const { inicio, fin } = bloques[i]
    if (cluster.length > 0 && inicio >= finDelCluster) {
      cerrarCluster()
      finDelCluster = -Infinity
    }

    let columna = finDeColumna.findIndex((finPrevio) => finPrevio <= inicio)
    if (columna === -1) columna = finDeColumna.length
    finDeColumna[columna] = fin
    resultado[i].columna = columna
    cluster.push(i)
    finDelCluster = Math.max(finDelCluster, fin)
  }
  cerrarCluster()

  return resultado
}
