import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { BloqueoAgendaResponse, EstadoTurno, TurnoResponse } from '../types/api'
import {
  appointmentUpdateFromEvent,
  asignarColumnasEventos,
  bloqueoACalendarEvent,
  calendarDraftFromSelection,
  crearRangoSemanal,
  contarTurnosEnDiasOcultos,
  diaHabilInicial,
  esEventoCorto,
  etiquetaPeriodo,
  etiquetaRango,
  serializarRangoVisible,
  siguienteDiaHabil,
  textoAvisoFinDeSemana,
  textosEvento,
  turnoACalendarEvent,
  turnoEsEditable,
  vistaInicial,
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

describe('esEventoCorto', () => {
  const evento = (inicio: string, fin: string, allDay = false) => ({
    id: 'e',
    title: 'e',
    start: dayjs(inicio),
    end: dayjs(fin),
    allDay,
  })

  it.each([
    ['15 minutes', '2026-05-04T10:15:00', true],
    ['20 minutes', '2026-05-04T10:20:00', true],
    ['21 minutes', '2026-05-04T10:21:00', false],
    ['30 minutes', '2026-05-04T10:30:00', false],
    ['60 minutes', '2026-05-04T11:00:00', false],
  ])('classifies %s', (_label, fin, esperado) => {
    expect(esEventoCorto(evento('2026-05-04T10:00:00', fin))).toBe(esperado)
  })

  it('treats zero or negative durations as not short', () => {
    expect(esEventoCorto(evento('2026-05-04T10:00:00', '2026-05-04T10:00:00'))).toBe(false)
    expect(esEventoCorto(evento('2026-05-04T10:00:00', '2026-05-04T09:50:00'))).toBe(false)
  })

  it('treats all-day and multi-day events as not short', () => {
    expect(esEventoCorto(evento('2026-05-04T00:00:00', '2026-05-04T00:10:00', true))).toBe(false)
    expect(esEventoCorto(evento('2026-05-04T23:50:00', '2026-05-05T00:05:00'))).toBe(false)
  })
})

describe('etiquetaRango', () => {
  it('shows the first to last visible day when the range ends on the weekend', () => {
    const etiqueta = etiquetaRango(dayjs('2026-09-21T00:00:00'), dayjs('2026-09-27T23:59:59'))
    expect(etiqueta).toBe('21 sep – 25 sep 2026')
  })

  it('keeps a single day as a long date', () => {
    const etiqueta = etiquetaRango(dayjs('2026-09-23T00:00:00'), dayjs('2026-09-23T23:59:59'))
    expect(etiqueta).toBe('23 de septiembre de 2026')
  })

  it('keeps a weekend-only single day untouched', () => {
    const etiqueta = etiquetaRango(dayjs('2026-09-26T00:00:00'), dayjs('2026-09-26T23:59:59'))
    expect(etiqueta).toBe('26 de septiembre de 2026')
  })

  it('trims weekend days at both ends of a longer range', () => {
    const etiqueta = etiquetaRango(dayjs('2026-09-26T00:00:00'), dayjs('2026-10-11T23:59:59'))
    expect(etiqueta).toBe('28 sep – 9 oct 2026')
  })
})

describe('etiquetaPeriodo', () => {
  const semanaIni = dayjs('2026-09-21T00:00:00')
  const semanaFin = dayjs('2026-09-27T23:59:59')

  it('week: capitalizes month abbreviations of the Monday to Friday range', () => {
    expect(etiquetaPeriodo('week', dayjs('2026-09-23'), semanaIni, semanaFin)).toBe(
      '21 Sep – 25 Sep 2026',
    )
  })

  it('week: handles a range that crosses a month boundary', () => {
    const etiqueta = etiquetaPeriodo(
      'week',
      dayjs('2026-09-30'),
      dayjs('2026-09-28T00:00:00'),
      dayjs('2026-10-04T23:59:59'),
    )
    expect(etiqueta).toBe('28 Sep – 2 Oct 2026')
  })

  it('week: handles a range that crosses a year boundary', () => {
    const etiqueta = etiquetaPeriodo(
      'week',
      dayjs('2026-12-31'),
      dayjs('2026-12-28T00:00:00'),
      dayjs('2027-01-03T23:59:59'),
    )
    expect(etiqueta).toBe('28 Dic – 1 Ene 2027')
  })

  it('day: capitalizes the weekday and keeps "de" and the month lowercase', () => {
    expect(etiquetaPeriodo('day', dayjs('2026-09-26'), semanaIni, semanaFin)).toBe(
      'Sábado 26 de septiembre de 2026',
    )
    expect(etiquetaPeriodo('day', dayjs('2026-09-21'), semanaIni, semanaFin)).toBe(
      'Lunes 21 de septiembre de 2026',
    )
  })

  it('day: supports a leap day', () => {
    expect(etiquetaPeriodo('day', dayjs('2028-02-29'), semanaIni, semanaFin)).toBe(
      'Martes 29 de febrero de 2028',
    )
  })

  it('month: uses the current date month, not the visible grid range', () => {
    const etiqueta = etiquetaPeriodo(
      'month',
      dayjs('2026-10-15'),
      dayjs('2026-09-28T00:00:00'),
      dayjs('2026-11-06T23:59:59'),
    )
    expect(etiqueta).toBe('Octubre de 2026')
  })

  it('month: works at month and year boundaries', () => {
    const rango = [dayjs('2026-12-28'), dayjs('2027-02-06')] as const
    expect(etiquetaPeriodo('month', dayjs('2026-12-31'), ...rango)).toBe('Diciembre de 2026')
    expect(etiquetaPeriodo('month', dayjs('2027-01-01'), ...rango)).toBe('Enero de 2027')
  })

  it('falls back to the range label for other views', () => {
    expect(etiquetaPeriodo('year', dayjs('2026-09-23'), semanaIni, semanaFin)).toBe(
      '21 Sep – 25 Sep 2026',
    )
  })
})

describe('contarTurnosEnDiasOcultos', () => {
  const rango = { inicio: dayjs('2026-09-21T00:00:00'), fin: dayjs('2026-09-27T23:59:59') }

  it('counts appointments on Saturday and Sunday of the range', () => {
    const turnos = [
      { fechaHora: '2026-09-21T10:00:00' },
      { fechaHora: '2026-09-26T10:00:00' },
      { fechaHora: '2026-09-27T18:30:00' },
    ]
    expect(contarTurnosEnDiasOcultos(turnos, rango)).toBe(2)
  })

  it('ignores weekend appointments outside the range', () => {
    const turnos = [{ fechaHora: '2026-09-19T10:00:00' }, { fechaHora: '2026-10-03T10:00:00' }]
    expect(contarTurnosEnDiasOcultos(turnos, rango)).toBe(0)
  })

  it('returns 0 when there are no appointments', () => {
    expect(contarTurnosEnDiasOcultos([], rango)).toBe(0)
  })
})

describe('vistaInicial', () => {
  it('starts in day view below the app breakpoint', () => {
    expect(vistaInicial(390)).toBe('day')
    expect(vistaInicial(859)).toBe('day')
  })

  it('starts in week view from the app breakpoint', () => {
    expect(vistaInicial(860)).toBe('week')
    expect(vistaInicial(1440)).toBe('week')
  })
})

describe('asignarColumnasEventos', () => {
  const ev = (id: string, inicio: string, fin: string, allDay = false) => ({
    id,
    title: id,
    start: dayjs(inicio),
    end: dayjs(fin),
    allDay,
  })

  it('gives a lone event the full width', () => {
    const mapa = asignarColumnasEventos([ev('a', '2026-09-21T09:00:00', '2026-09-21T10:00:00')])

    expect(mapa.get('a')).toEqual({ columna: 0, total: 1 })
  })

  it('splits two overlapping events into two columns', () => {
    const mapa = asignarColumnasEventos([
      ev('a', '2026-09-21T09:00:00', '2026-09-21T10:00:00'),
      ev('b', '2026-09-21T09:30:00', '2026-09-21T10:30:00'),
    ])

    expect(mapa.get('a')).toEqual({ columna: 0, total: 2 })
    expect(mapa.get('b')).toEqual({ columna: 1, total: 2 })
  })

  it('shares one cluster across a chain of overlaps', () => {
    const mapa = asignarColumnasEventos([
      ev('a', '2026-09-21T09:00:00', '2026-09-21T10:00:00'),
      ev('b', '2026-09-21T09:30:00', '2026-09-21T11:00:00'),
      ev('c', '2026-09-21T10:15:00', '2026-09-21T11:30:00'),
    ])

    expect(mapa.get('a')).toEqual({ columna: 0, total: 2 })
    expect(mapa.get('b')).toEqual({ columna: 1, total: 2 })
    expect(mapa.get('c')).toEqual({ columna: 0, total: 2 })
  })

  it('does not treat back-to-back events as overlapping', () => {
    const mapa = asignarColumnasEventos([
      ev('a', '2026-09-21T09:00:00', '2026-09-21T10:00:00'),
      ev('b', '2026-09-21T10:00:00', '2026-09-21T11:00:00'),
    ])

    expect(mapa.get('a')).toEqual({ columna: 0, total: 1 })
    expect(mapa.get('b')).toEqual({ columna: 0, total: 1 })
  })

  it('lays out each calendar day independently', () => {
    const mapa = asignarColumnasEventos([
      ev('a', '2026-09-21T09:00:00', '2026-09-21T10:00:00'),
      ev('b', '2026-09-22T09:00:00', '2026-09-22T10:00:00'),
    ])

    expect(mapa.get('a')).toEqual({ columna: 0, total: 1 })
    expect(mapa.get('b')).toEqual({ columna: 0, total: 1 })
  })

  it('does not depend on the input order', () => {
    const a = ev('a', '2026-09-21T09:00:00', '2026-09-21T10:00:00')
    const b = ev('b', '2026-09-21T09:30:00', '2026-09-21T10:30:00')

    expect(asignarColumnasEventos([b, a]).get('a')).toEqual({ columna: 0, total: 2 })
    expect(asignarColumnasEventos([b, a]).get('b')).toEqual({ columna: 1, total: 2 })
  })

  it('skips all-day and multi-day events so they keep the library layout', () => {
    const mapa = asignarColumnasEventos([
      ev('todo', '2026-09-21T00:00:00', '2026-09-21T23:59:59', true),
      ev('largo', '2026-09-21T22:00:00', '2026-09-22T02:00:00'),
      ev('a', '2026-09-21T09:00:00', '2026-09-21T10:00:00'),
    ])

    expect(mapa.has('todo')).toBe(false)
    expect(mapa.has('largo')).toBe(false)
    expect(mapa.get('a')).toEqual({ columna: 0, total: 1 })
  })

  it('treats a zero-length event as a short block that can still overlap', () => {
    const mapa = asignarColumnasEventos([
      ev('a', '2026-09-21T09:00:00', '2026-09-21T09:00:00'),
      ev('b', '2026-09-21T09:05:00', '2026-09-21T10:00:00'),
    ])

    expect(mapa.get('a')?.total).toBe(2)
    expect(mapa.get('b')?.total).toBe(2)
  })
})

describe('siguienteDiaHabil', () => {
  const ymd = (fecha: dayjs.Dayjs) => fecha.format('YYYY-MM-DD')

  it('moves one day inside the working week', () => {
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-23'), 1))).toBe('2026-09-24')
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-23'), -1))).toBe('2026-09-22')
  })

  it('jumps from Friday to Monday going forward', () => {
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-25'), 1))).toBe('2026-09-28')
  })

  it('jumps from Monday to the previous Friday going back', () => {
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-21'), -1))).toBe('2026-09-18')
  })

  it('lands on a working day when starting on a weekend', () => {
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-26'), 1))).toBe('2026-09-28')
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-27'), 1))).toBe('2026-09-28')
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-26'), -1))).toBe('2026-09-25')
    expect(ymd(siguienteDiaHabil(dayjs('2026-09-27'), -1))).toBe('2026-09-25')
  })

  it('crosses month and year boundaries', () => {
    expect(ymd(siguienteDiaHabil(dayjs('2026-10-30'), 1))).toBe('2026-11-02')
    expect(ymd(siguienteDiaHabil(dayjs('2026-11-02'), -1))).toBe('2026-10-30')
    expect(ymd(siguienteDiaHabil(dayjs('2027-12-31'), 1))).toBe('2028-01-03')
    expect(ymd(siguienteDiaHabil(dayjs('2029-01-01'), -1))).toBe('2028-12-29')
  })

  it('handles the leap day', () => {
    expect(ymd(siguienteDiaHabil(dayjs('2028-02-28'), 1))).toBe('2028-02-29')
    expect(ymd(siguienteDiaHabil(dayjs('2028-02-29'), 1))).toBe('2028-03-01')
    expect(ymd(siguienteDiaHabil(dayjs('2028-03-01'), -1))).toBe('2028-02-29')
  })

  it('keeps the time of day', () => {
    expect(siguienteDiaHabil(dayjs('2026-09-25T15:30:00'), 1).format('HH:mm')).toBe('15:30')
  })
})

describe('diaHabilInicial', () => {
  const ymd = (fecha: dayjs.Dayjs) => fecha.format('YYYY-MM-DD')

  it('keeps a working day as is', () => {
    expect(ymd(diaHabilInicial(dayjs('2026-09-21')))).toBe('2026-09-21')
    expect(ymd(diaHabilInicial(dayjs('2026-09-25')))).toBe('2026-09-25')
  })

  it('moves Saturday and Sunday to the next Monday', () => {
    expect(ymd(diaHabilInicial(dayjs('2026-09-26')))).toBe('2026-09-28')
    expect(ymd(diaHabilInicial(dayjs('2026-09-27')))).toBe('2026-09-28')
  })

  it('crosses month and year boundaries', () => {
    expect(ymd(diaHabilInicial(dayjs('2026-10-31')))).toBe('2026-11-02')
    expect(ymd(diaHabilInicial(dayjs('2028-12-31')))).toBe('2029-01-01')
  })
})

describe('textoAvisoFinDeSemana', () => {
  it('uses the singular for one appointment', () => {
    expect(textoAvisoFinDeSemana(1, false)).toBe(
      'Hay 1 turno el sábado o domingo que no se muestra acá. Podés verlo en la lista de abajo.',
    )
  })

  it('uses the plural for several appointments', () => {
    expect(textoAvisoFinDeSemana(4, false)).toBe(
      'Hay 4 turnos el sábado o domingo que no se muestran acá. Podés verlos en la lista de abajo.',
    )
  })

  it('tells to clear the filters when some are active', () => {
    expect(textoAvisoFinDeSemana(1, true)).toBe(
      'Hay 1 turno el sábado o domingo que no se muestra acá. Quitá los filtros para verlo en la lista de abajo.',
    )
    expect(textoAvisoFinDeSemana(3, true)).toBe(
      'Hay 3 turnos el sábado o domingo que no se muestran acá. Quitá los filtros para verlos en la lista de abajo.',
    )
  })
})
