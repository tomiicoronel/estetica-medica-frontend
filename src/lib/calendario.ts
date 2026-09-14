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
}

const COLORES_ESTADO: Record<EstadoTurno, ColoresEvento> = {
  PENDIENTE: {
    color: 'var(--color-sand-800)',
    backgroundColor: 'var(--color-sand-200)',
  },
  CONFIRMADO: {
    color: 'var(--color-sage-700)',
    backgroundColor: 'var(--color-sage-100)',
  },
  REALIZADO: {
    color: 'var(--color-sage-900)',
    backgroundColor: 'var(--color-sage-300)',
  },
  CANCELADO: {
    color: 'var(--color-clay-700)',
    backgroundColor: 'var(--color-clay-100)',
  },
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
  const servicios = turno.servicios.map(({ nombre }) => nombre).filter(Boolean).join(', ')

  return {
    id: `turno-${turno.id}`,
    title: `${nombrePaciente} · ${servicios || 'Sin servicio'}`,
    start: dayjs(turno.fechaHora),
    end: dayjs(turno.fechaHoraFin),
    ...COLORES_ESTADO[turno.estado],
    description: turno.observaciones,
    data: {
      tipo: 'turno',
      turnoId: turno.id,
      pacienteId: turno.pacienteId,
      estado: turno.estado,
      editable: turnoEsEditable(turno.estado),
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
