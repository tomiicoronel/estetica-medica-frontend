/**
 * Pure helpers for the dashboard agenda (today's list) and the shared column
 * layout used by the Turnos calendar. Dates are `LocalDateTime` strings,
 * parsed as local time (see `fecha.ts`).
 */

export interface Columna {
  columna: number
  total: number
}

export interface TurnoAgenda {
  id: string
  fechaHora: string
  fechaHoraFin: string
}

export interface FilaAgenda<T extends TurnoAgenda> {
  turno: T
  /** Already finished: shown dimmed. */
  pasado: boolean
  /** Started and not finished yet. */
  enCurso: boolean
  duracionMinutos: number
}

export interface AgendaDelDia<T extends TurnoAgenda> {
  filas: FilaAgenda<T>[]
  /**
   * Index of the first row that is not finished, where the "now" marker goes.
   * `null` when nothing has finished yet (the marker would only add noise at the
   * top) or when everything has finished.
   */
  indiceAhora: number | null
}

/**
 * Today's appointments in chronological order, flagged against `ahora`. A list
 * never overlaps, whatever the duration of each appointment.
 */
export function armarAgendaDelDia<T extends TurnoAgenda>(turnos: T[], ahora: Date): AgendaDelDia<T> {
  const ahoraMs = ahora.getTime()
  const filas = [...turnos]
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora) || a.id.localeCompare(b.id))
    .map((turno) => {
      const inicio = Date.parse(turno.fechaHora)
      const fin = Date.parse(turno.fechaHoraFin)
      const duracionMinutos = Number.isNaN(inicio) || Number.isNaN(fin)
        ? 0
        : Math.max(0, Math.round((fin - inicio) / 60000))
      const pasado = !Number.isNaN(fin) && fin <= ahoraMs
      const enCurso = !pasado && !Number.isNaN(inicio) && inicio <= ahoraMs
      return { turno, pasado, enCurso, duracionMinutos }
    })

  const primeroPendiente = filas.findIndex((fila) => !fila.pasado)
  const indiceAhora = primeroPendiente > 0 ? primeroPendiente : null
  return { filas, indiceAhora }
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
