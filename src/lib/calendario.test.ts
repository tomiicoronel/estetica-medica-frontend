import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { BloqueoAgendaResponse, EstadoTurno, TurnoResponse } from '../types/api'
import {
  appointmentUpdateFromEvent,
  bloqueoACalendarEvent,
  calendarDraftFromSelection,
  crearRangoSemanal,
  serializarRangoVisible,
  textosEvento,
  turnoACalendarEvent,
  turnoEsEditable,
} from './calendario'

const TURNO_BASE: TurnoResponse = {
  id: 'turno-1',
  profesionalId: 'profesional-1',
  pacienteId: 'paciente-1',
  fechaHora: '2026-09-14T09:30:00',
  fechaHoraFin: '2026-09-14T10:45:00',
  estado: 'CONFIRMADO',
  montoTotal: 25000,
  observaciones: 'Control',
  servicios: [
    { servicioId: 'servicio-1', nombre: 'Limpieza facial', precioMomento: 10000 },
    { servicioId: 'servicio-2', nombre: 'Peeling', precioMomento: 15000 },
  ],
  creadoEn: '2026-09-01T10:00:00',
  actualizadoEn: '2026-09-01T10:00:00',
}

const BLOQUEO_BASE: BloqueoAgendaResponse = {
  id: 'bloqueo-1',
  profesionalId: 'profesional-1',
  fechaInicio: '2026-09-14T12:00:00',
  fechaFin: '2026-09-14T13:30:00',
  motivo: 'Almuerzo',
  creadoEn: '2026-09-01T10:00:00',
  actualizadoEn: '2026-09-01T10:00:00',
}

describe('serializarRangoVisible', () => {
  it('serializes the local visible bounds without converting them to UTC', () => {
    expect(
      serializarRangoVisible({
        inicio: dayjs('2026-09-14T08:00:00'),
        fin: dayjs('2026-09-21T20:00:00'),
      }),
    ).toEqual({
      desde: '2026-09-14T08:00:00',
      hasta: '2026-09-21T20:00:00',
    })
  })
})

describe('crearRangoSemanal', () => {
  it('uses Monday through Sunday regardless of the selected weekday', () => {
    const rango = crearRangoSemanal(dayjs('2026-09-16T14:30:00'))

    expect(rango.inicio.format('YYYY-MM-DDTHH:mm:ss')).toBe('2026-09-14T00:00:00')
    expect(rango.fin.format('YYYY-MM-DDTHH:mm:ss')).toBe('2026-09-20T23:59:59')
  })
})

describe('turnoACalendarEvent', () => {
  it('maps the mandatory end, readable title, state color and source metadata', () => {
    const event = turnoACalendarEvent(TURNO_BASE, 'Ana Pérez')

    expect(event).toMatchObject({
      id: 'turno-turno-1',
      title: 'Ana Pérez · Limpieza facial, Peeling',
      color: 'var(--color-estado-confirmado-fg)',
      backgroundColor: 'var(--color-estado-confirmado-bg)',
      description: 'Control',
      data: {
        tipo: 'turno',
        turnoId: 'turno-1',
        estado: 'CONFIRMADO',
        editable: true,
        linea: 'var(--color-estado-confirmado-linea)',
      },
    })
    expect(event.start.format('YYYY-MM-DDTHH:mm:ss')).toBe(TURNO_BASE.fechaHora)
    expect(event.end.format('YYYY-MM-DDTHH:mm:ss')).toBe(TURNO_BASE.fechaHoraFin)
  })

  it.each<[EstadoTurno, string]>([
    ['PENDIENTE', 'pendiente'],
    ['CONFIRMADO', 'confirmado'],
    ['REALIZADO', 'realizado'],
    ['CANCELADO', 'cancelado'],
  ])('maps %s to the shared estado design tokens', (estado, token) => {
    const event = turnoACalendarEvent({ ...TURNO_BASE, estado })

    expect(event.backgroundColor).toBe(`var(--color-estado-${token}-bg)`)
    expect(event.color).toBe(`var(--color-estado-${token}-fg)`)
    expect(event.data?.linea).toBe(`var(--color-estado-${token}-linea)`)
  })

  it('uses readable fallbacks when patient or service names are unavailable', () => {
    const event = turnoACalendarEvent({ ...TURNO_BASE, servicios: [] })

    expect(event.title).toBe('Paciente · Sin servicio')
  })
})

describe('bloqueoACalendarEvent', () => {
  it('maps an unavailable block with its range and metadata', () => {
    const event = bloqueoACalendarEvent(BLOQUEO_BASE)

    expect(event).toMatchObject({
      id: 'bloqueo-bloqueo-1',
      title: 'No disponible · Almuerzo',
      color: 'var(--color-sand-800)',
      backgroundColor: 'var(--color-sand-300)',
      data: {
        tipo: 'bloqueo',
        bloqueoId: 'bloqueo-1',
        noDisponible: true,
        editable: true,
      },
    })
    expect(event.start.format('YYYY-MM-DDTHH:mm:ss')).toBe(BLOQUEO_BASE.fechaInicio)
    expect(event.end.format('YYYY-MM-DDTHH:mm:ss')).toBe(BLOQUEO_BASE.fechaFin)
  })

  it('uses a concise fallback title when no reason is provided', () => {
    expect(bloqueoACalendarEvent({ ...BLOQUEO_BASE, motivo: undefined }).title).toBe(
      'No disponible',
    )
  })
})

describe('turnoEsEditable', () => {
  it.each<EstadoTurno>(['PENDIENTE', 'CONFIRMADO'])('allows editing %s appointments', (estado) => {
    expect(turnoEsEditable(estado)).toBe(true)
  })

  it.each<EstadoTurno>(['REALIZADO', 'CANCELADO'])('prevents editing %s appointments', (estado) => {
    expect(turnoEsEditable(estado)).toBe(false)
  })
})

describe('calendarDraftFromSelection', () => {
  it('preserves the exact local start and end without a UTC conversion', () => {
    expect(
      calendarDraftFromSelection({
        start: dayjs('2026-09-16T09:15:00'),
        end: dayjs('2026-09-16T10:45:00'),
      }),
    ).toEqual({
      start: '2026-09-16T09:15:00',
      end: '2026-09-16T10:45:00',
    })
  })
})

describe('appointmentUpdateFromEvent', () => {
  const movedEvent = {
    ...turnoACalendarEvent(TURNO_BASE, 'Ana Pérez'),
    start: dayjs('2026-09-15T11:00:00'),
    end: dayjs('2026-09-15T12:15:00'),
  }

  it('builds the update payload while preserving services and notes', () => {
    expect(appointmentUpdateFromEvent(TURNO_BASE, movedEvent)).toEqual({
      fechaHora: '2026-09-15T11:00:00',
      fechaHoraFin: '2026-09-15T12:15:00',
      servicioIds: ['servicio-1', 'servicio-2'],
      observaciones: 'Control',
    })
  })

  it.each<EstadoTurno>(['REALIZADO', 'CANCELADO'])(
    'rejects updates for %s appointments',
    (estado) => {
      expect(appointmentUpdateFromEvent({ ...TURNO_BASE, estado }, movedEvent)).toBeNull()
    },
  )
})

describe('textosEvento', () => {
  it('splits an appointment into patient name and time range with services', () => {
    const event = turnoACalendarEvent(TURNO_BASE, 'Ana Pérez')

    expect(textosEvento(event)).toEqual({
      titulo: 'Ana Pérez',
      detalle: '09:30 – 10:45 · Limpieza facial, Peeling',
      tachado: false,
    })
  })

  it('uses the readable fallback when there are no services', () => {
    const event = turnoACalendarEvent({ ...TURNO_BASE, servicios: [] }, 'Ana Pérez')

    expect(textosEvento(event).detalle).toBe('09:30 – 10:45 · Sin servicio')
  })

  it('strikes through only cancelled appointments', () => {
    const cancelado = turnoACalendarEvent({ ...TURNO_BASE, estado: 'CANCELADO' }, 'Ana Pérez')
    const pendiente = turnoACalendarEvent({ ...TURNO_BASE, estado: 'PENDIENTE' }, 'Ana Pérez')

    expect(textosEvento(cancelado).tachado).toBe(true)
    expect(textosEvento(pendiente).tachado).toBe(false)
  })

  it('keeps the blocked slot title and shows only its time range', () => {
    const event = bloqueoACalendarEvent(BLOQUEO_BASE)

    expect(textosEvento(event)).toEqual({
      titulo: 'No disponible · Almuerzo',
      detalle: '12:00 – 13:30',
      tachado: false,
    })
  })
})
