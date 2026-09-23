import { esHoraValida } from './fecha'

const MINUTOS_POR_DIA = 24 * 60

/** `HH:mm` → minutos desde medianoche, o `null` si la hora es inválida. */
export function horaAMinutos(hora: string): number | null {
  if (!esHoraValida(hora)) return null
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

/** Minutos desde medianoche (0-1439) → `HH:mm`. */
export function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
}

/**
 * Sugiere la hora de fin sumando la duración total de los servicios elegidos
 * a la hora de inicio. `null` si falta algún dato o si la suma llega o cruza
 * la medianoche: el fin es siempre del mismo día.
 */
export function sugerirFin(horaInicio: string, duracionTotalMinutos: number): string | null {
  const inicio = horaAMinutos(horaInicio)
  if (inicio === null) return null
  if (!Number.isFinite(duracionTotalMinutos) || duracionTotalMinutos <= 0) return null

  const fin = inicio + duracionTotalMinutos
  if (fin >= MINUTOS_POR_DIA) return null

  return minutosAHora(fin)
}

/**
 * Duración por defecto (minutos) para sugerir "Hora de fin" cuando el turno
 * no tiene servicios elegidos. Mismo default que `TURNO_DURACION_DEFAULT_MINUTOS`
 * en el backend; es solo una sugerencia de UX, el backend es la autoridad real.
 */
export const DURACION_DEFAULT_SIN_SERVICIO_MINUTOS = 30

/**
 * Igual que `sugerirFin`, pero si no hay duración (sin servicios elegidos)
 * cae al default `DURACION_DEFAULT_SIN_SERVICIO_MINUTOS` en vez de devolver
 * `null`. `sugerirFin` no cambia su comportamiento.
 */
export function sugerirFinTurno(horaInicio: string, duracionTotalMinutos: number): string | null {
  if (duracionTotalMinutos > 0) return sugerirFin(horaInicio, duracionTotalMinutos)
  return sugerirFin(horaInicio, DURACION_DEFAULT_SIN_SERVICIO_MINUTOS)
}

/**
 * Desplaza la hora de fin cuando cambia la de inicio, conservando la duración
 * actual del par inicio/fin (como arrastrar un evento en Google Calendar).
 * `null` si algún dato es inválido, el par actual no es válido (fin <= inicio)
 * o el desplazamiento cruza la medianoche.
 */
export function desplazarFin(
  horaInicioAnterior: string,
  horaFinAnterior: string,
  horaInicioNueva: string,
): string | null {
  const inicioAnterior = horaAMinutos(horaInicioAnterior)
  const finAnterior = horaAMinutos(horaFinAnterior)
  const inicioNuevo = horaAMinutos(horaInicioNueva)
  if (inicioAnterior === null || finAnterior === null || inicioNuevo === null) return null

  const duracion = finAnterior - inicioAnterior
  if (duracion <= 0) return null

  const finNuevo = inicioNuevo + duracion
  if (finNuevo >= MINUTOS_POR_DIA) return null

  return minutosAHora(finNuevo)
}

/**
 * Valida un par inicio/fin: el fin tiene que ser posterior al inicio, del
 * mismo día, y la duración no puede superar las 12 horas (el máximo que
 * acepta el backend). Devuelve el mensaje de error en español, o `null` si
 * el par es válido.
 */
export function validarRangoHorario(horaInicio: string, horaFin: string): string | null {
  const inicio = horaAMinutos(horaInicio)
  const fin = horaAMinutos(horaFin)
  if (inicio === null || fin === null) {
    return 'La hora tiene que estar en formato hh:mm, por ejemplo 14:30.'
  }

  if (fin <= inicio) {
    return 'La hora de fin tiene que ser posterior a la de inicio.'
  }

  if (fin - inicio > 12 * 60) {
    return 'La duración del turno no puede superar las 12 horas.'
  }

  return null
}
