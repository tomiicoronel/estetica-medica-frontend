import type { CalendarEvent, CellInfo } from '@ilamy/calendar'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/es'
import { asignarColumnas, type Columna } from './agendaDia'
import type {
  BloqueoAgendaResponse,
  ActualizarTurnoRequest,
  EstadoTurno,
  LocalDateTime,
  TurnoResponse,
} from '../types/api'

export interface RangoVisible {
  inicio: Dayjs
  fin: Dayjs
}

export interface RangoTurnosSerializado {
  desde: LocalDateTime
  hasta: LocalDateTime
}

interface ColoresEvento {
  color: string
  backgroundColor: string
  /** Accent color, e.g. for the left border of an appointment card. */
  linea: string
}

function coloresDeEstado(estado: string): ColoresEvento {
  return {
    color: `var(--color-estado-${estado}-fg)`,
    backgroundColor: `var(--color-estado-${estado}-bg)`,
    linea: `var(--color-estado-${estado}-linea)`,
  }
}

export const COLORES_ESTADO: Record<EstadoTurno, ColoresEvento> = {
  PENDIENTE: coloresDeEstado('pendiente'),
  CONFIRMADO: coloresDeEstado('confirmado'),
  REALIZADO: coloresDeEstado('realizado'),
  CANCELADO: coloresDeEstado('cancelado'),
}

const FORMATO_LOCAL_DATE_TIME = 'YYYY-MM-DDTHH:mm:ss'

export interface CalendarDraft {
  start: LocalDateTime
  end: LocalDateTime
}

function formatLocalDateTime(value: Dayjs): LocalDateTime {
  return value.format(FORMATO_LOCAL_DATE_TIME)
}

export function calendarDraftFromSelection(
  selection: Pick<CellInfo, 'start' | 'end'>,
): CalendarDraft {
  return {
    start: formatLocalDateTime(selection.start),
    end: formatLocalDateTime(selection.end),
  }
}

export function appointmentUpdateFromEvent(
  turno: TurnoResponse,
  event: CalendarEvent,
): ActualizarTurnoRequest | null {
  if (!turnoEsEditable(turno.estado)) return null

  return {
    fechaHora: formatLocalDateTime(event.start),
    fechaHoraFin: formatLocalDateTime(event.end),
    servicioIds: turno.servicios.map(({ servicioId }) => servicioId),
    observaciones: turno.observaciones,
  }
}

export function crearRangoSemanal(fecha: Dayjs): RangoVisible {
  const diasDesdeLunes = (fecha.day() + 6) % 7
  const inicio = fecha.subtract(diasDesdeLunes, 'day').startOf('day')

  return { inicio, fin: inicio.add(6, 'day').endOf('day') }
}

export function serializarRangoVisible(rango: RangoVisible): RangoTurnosSerializado {
  return {
    desde: formatLocalDateTime(rango.inicio),
    hasta: formatLocalDateTime(rango.fin),
  }
}

export function turnoEsEditable(estado: EstadoTurno): boolean {
  return estado !== 'REALIZADO' && estado !== 'CANCELADO'
}

export function turnoACalendarEvent(
  turno: TurnoResponse,
  nombrePaciente = 'Paciente',
): CalendarEvent {
  const servicios =
    turno.servicios.map(({ nombre }) => nombre).filter(Boolean).join(', ') || 'Sin servicio'
  const { color, backgroundColor, linea } = COLORES_ESTADO[turno.estado]

  return {
    id: `turno-${turno.id}`,
    title: `${nombrePaciente} · ${servicios}`,
    start: dayjs(turno.fechaHora),
    end: dayjs(turno.fechaHoraFin),
    color,
    backgroundColor,
    description: turno.observaciones,
    data: {
      tipo: 'turno',
      turnoId: turno.id,
      pacienteId: turno.pacienteId,
      estado: turno.estado,
      editable: turnoEsEditable(turno.estado),
      linea,
      paciente: nombrePaciente,
      servicios,
    },
  }
}

export function bloqueoACalendarEvent(bloqueo: BloqueoAgendaResponse): CalendarEvent {
  const motivo = bloqueo.motivo?.trim()

  return {
    id: `bloqueo-${bloqueo.id}`,
    title: motivo ? `No disponible · ${motivo}` : 'No disponible',
    start: dayjs(bloqueo.fechaInicio),
    end: dayjs(bloqueo.fechaFin),
    color: 'var(--color-sand-800)',
    backgroundColor: 'var(--color-sand-300)',
    description: motivo,
    data: {
      tipo: 'bloqueo',
      bloqueoId: bloqueo.id,
      noDisponible: true,
      editable: true,
    },
  }
}

export interface TextosEvento {
  /** First line: patient name (or the block title). */
  titulo: string
  /** Second line: `HH:MM – HH:MM`, followed by the services for appointments. */
  detalle: string
  /** True when the title should be struck through (cancelled appointments). */
  tachado: boolean
}

export function textosEvento(event: CalendarEvent): TextosEvento {
  const rango = `${event.start.format('HH:mm')} – ${event.end.format('HH:mm')}`
  const { tipo, paciente, servicios, estado } = event.data ?? {}

  if (tipo === 'turno' && typeof paciente === 'string') {
    return {
      titulo: paciente,
      detalle: typeof servicios === 'string' && servicios ? `${rango} · ${servicios}` : rango,
      tachado: estado === 'CANCELADO',
    }
  }

  return { titulo: event.title, detalle: rango, tachado: false }
}

const MINUTOS_EVENTO_CORTO = 20

/** True for timed, single-day events of 1 to 20 minutes, which get a compact one-line layout. */
export function esEventoCorto(event: Pick<CalendarEvent, 'start' | 'end' | 'allDay'>): boolean {
  if (event.allDay || !event.start.isSame(event.end, 'day')) return false
  const minutos = event.end.diff(event.start, 'minute', true)
  return minutos > 0 && minutos <= MINUTOS_EVENTO_CORTO
}

function esFinDeSemana(fecha: Dayjs): boolean {
  return fecha.day() === 0 || fecha.day() === 6
}

/**
 * Moves `fecha` one working day forward (`1`) or back (`-1`), skipping Saturday and Sunday:
 * Friday -> Monday going forward, Monday -> Friday going back. A weekend input lands on the
 * nearest working day in that direction.
 */
export function siguienteDiaHabil(fecha: Dayjs, direccion: 1 | -1): Dayjs {
  let resultado = fecha.add(direccion, 'day')
  while (esFinDeSemana(resultado)) resultado = resultado.add(direccion, 'day')
  return resultado
}

/** The date the agenda should open on: today, or the next Monday when today is Saturday or Sunday. */
export function diaHabilInicial(hoy: Dayjs): Dayjs {
  return esFinDeSemana(hoy) ? siguienteDiaHabil(hoy, 1) : hoy
}

/**
 * Range label for the agenda header, skipping Saturday/Sunday at both ends because
 * the agenda only shows Monday to Friday. A single day is shown as a long date.
 */
export function etiquetaRango(inicio: Dayjs, fin: Dayjs): string {
  if (inicio.isSame(fin, 'day')) return inicio.locale('es').format('D [de] MMMM [de] YYYY')

  let primero = inicio.startOf('day')
  let ultimo = fin.startOf('day')
  while (esFinDeSemana(primero) && primero.isBefore(ultimo)) primero = primero.add(1, 'day')
  while (esFinDeSemana(ultimo) && ultimo.isAfter(primero)) ultimo = ultimo.subtract(1, 'day')

  return `${primero.locale('es').format('D MMM')} – ${ultimo.locale('es').format('D MMM YYYY')}`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Period label for the agenda header, already capitalized (no CSS `capitalize`, which would
 * also capitalize the word "de"). `fecha` is the calendar's current date, so the month view
 * shows the month the user is on and not the edges of the visible grid.
 */
export function etiquetaPeriodo(
  vista: string,
  fecha: Dayjs,
  inicio: Dayjs,
  fin: Dayjs,
): string {
  const f = fecha.locale('es')
  if (vista === 'day') return capitalizar(f.format('dddd D [de] MMMM [de] YYYY'))
  if (vista === 'month') return capitalizar(f.format('MMMM [de] YYYY'))
  return etiquetaRango(inicio, fin).replace(/[a-záéíóúñ]{3,}(?= |$)/g, capitalizar)
}

/** Number of appointments inside `rango` that fall on a Saturday or Sunday (hidden days). */
export function contarTurnosEnDiasOcultos(
  turnos: { fechaHora: LocalDateTime }[],
  rango: RangoVisible,
): number {
  return turnos.filter(({ fechaHora }) => {
    const fecha = dayjs(fechaHora)
    return esFinDeSemana(fecha) && !fecha.isBefore(rango.inicio) && !fecha.isAfter(rango.fin)
  }).length
}

/**
 * Notice shown when appointments fall on the hidden Saturday/Sunday. The list below the agenda
 * can be narrowed by status or date, so with active filters it tells the user to clear them.
 */
export function textoAvisoFinDeSemana(cantidad: number, hayFiltros: boolean): string {
  const singular = cantidad === 1
  const aviso = singular
    ? `Hay 1 turno el sábado o domingo que no se muestra acá.`
    : `Hay ${cantidad} turnos el sábado o domingo que no se muestran acá.`
  const verlos = singular ? 'verlo' : 'verlos'
  return hayFiltros
    ? `${aviso} Quitá los filtros para ${verlos} en la lista de abajo.`
    : `${aviso} Podés ${verlos} en la lista de abajo.`
}

/** Matches the `app` breakpoint (`--breakpoint-app`) in `index.css`. */
export const ANCHO_APP_PX = 860
export const CONSULTA_PANTALLA_CHICA = `(max-width: ${ANCHO_APP_PX - 1}px)`

/** Agenda view to open with: a single day on small screens, the week otherwise. */
export function vistaInicial(anchoPx: number): 'day' | 'week' {
  return anchoPx < ANCHO_APP_PX ? 'day' : 'week'
}

/** Initial agenda view for the current viewport; falls back to the week outside a browser. */
export function vistaInicialDelNavegador(): 'day' | 'week' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'week'
  return window.matchMedia(CONSULTA_PANTALLA_CHICA).matches ? 'day' : 'week'
}

/** Blocks shorter than this still occupy this much room when deciding overlaps (matches their minimum visible height). */
const MINUTOS_MINIMOS_BLOQUE = 15

/**
 * Side-by-side column for every timed, single-day event, computed per calendar day
 * (appointments and blocked slots share the same columns). All-day and multi-day
 * events are left out so they keep the library's own layout.
 */
export function asignarColumnasEventos(
  events: Pick<CalendarEvent, 'id' | 'start' | 'end' | 'allDay'>[],
): Map<CalendarEvent['id'], Columna> {
  const porDia = new Map<string, typeof events>()
  for (const event of events) {
    if (event.allDay || !event.start.isSame(event.end, 'day')) continue
    const dia = event.start.format('YYYY-MM-DD')
    porDia.set(dia, [...(porDia.get(dia) ?? []), event])
  }

  const resultado = new Map<CalendarEvent['id'], Columna>()
  for (const delDia of porDia.values()) {
    const bloques = delDia.map((event) => {
      const inicio = event.start.hour() * 60 + event.start.minute()
      const fin = event.end.hour() * 60 + event.end.minute()
      return { inicio, fin: Math.max(fin, inicio + MINUTOS_MINIMOS_BLOQUE) }
    })
    asignarColumnas(bloques).forEach((columna, i) => resultado.set(delDia[i].id, columna))
  }
  return resultado
}
