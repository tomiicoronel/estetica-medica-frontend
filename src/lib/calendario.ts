import type { CalendarEvent, CellInfo } from '@ilamy/calendar'
import dayjs, { type Dayjs } from 'dayjs'
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
