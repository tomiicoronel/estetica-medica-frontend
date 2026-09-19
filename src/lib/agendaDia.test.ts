import { describe, expect, it } from 'vitest'
import {
  ALTO_MINIMO_BLOQUE,
  asignarColumnas,
  desplazamientoAhora,
  posicionBloque,
  rangoHorasVisibles,
} from './agendaDia'

const dia = (hora: string) => `2026-06-01T${hora}:00`
const turno = (inicio: string, fin: string) => ({ fechaHora: dia(inicio), fechaHoraFin: dia(fin) })
const RANGO = { horaInicio: 8, horaFin: 18 }
const ALTURA_HORA = 60

describe('rangoHorasVisibles', () => {
  it('returns the default 08-18 range when there are no appointments', () => {
    expect(rangoHorasVisibles([])).toEqual(RANGO)
  })

  it('keeps the default range when appointments fit inside it', () => {
    expect(rangoHorasVisibles([turno('09:00', '10:30')])).toEqual(RANGO)
  })

  it('extends the start to the floor hour of an early appointment', () => {
    expect(rangoHorasVisibles([turno('06:30', '07:30')])).toEqual({ horaInicio: 6, horaFin: 18 })
  })

  it('extends the end to the ceiling hour of a late appointment', () => {
    expect(rangoHorasVisibles([turno('17:00', '19:15')])).toEqual({ horaInicio: 8, horaFin: 20 })
  })

  it('caps the range at midnight when an appointment crosses it', () => {
    const cruza = { fechaHora: dia('22:00'), fechaHoraFin: '2026-06-02T01:00:00' }
    expect(rangoHorasVisibles([cruza])).toEqual({ horaInicio: 8, horaFin: 24 })
  })

  it('ignores appointments with invalid dates', () => {
    expect(rangoHorasVisibles([{ fechaHora: 'nope', fechaHoraFin: 'nope' }])).toEqual(RANGO)
  })
})

describe('posicionBloque', () => {
  it('positions a block from the top of the range using the hour height', () => {
    expect(posicionBloque(dia('09:00'), dia('10:00'), RANGO, ALTURA_HORA)).toEqual({
      top: 60,
      height: 60,
    })
  })

  it('handles half-hour offsets', () => {
    expect(posicionBloque(dia('08:30'), dia('09:45'), RANGO, ALTURA_HORA)).toEqual({
      top: 30,
      height: 75,
    })
  })

  it('clips a block that starts before the visible range', () => {
    expect(posicionBloque(dia('07:30'), dia('08:30'), RANGO, ALTURA_HORA)).toEqual({
      top: 0,
      height: 30,
    })
  })

  it('clips a block that ends after the visible range', () => {
    expect(posicionBloque(dia('17:30'), dia('18:30'), RANGO, ALTURA_HORA)).toEqual({
      top: 570,
      height: 30,
    })
  })

  it('returns null for a block entirely outside the range', () => {
    expect(posicionBloque(dia('06:00'), dia('07:00'), RANGO, ALTURA_HORA)).toBeNull()
    expect(posicionBloque(dia('19:00'), dia('20:00'), RANGO, ALTURA_HORA)).toBeNull()
  })

  it('applies a minimum height to zero or negative durations', () => {
    expect(posicionBloque(dia('09:00'), dia('09:00'), RANGO, ALTURA_HORA)?.height).toBe(
      ALTO_MINIMO_BLOQUE,
    )
    expect(posicionBloque(dia('09:00'), dia('08:00'), RANGO, ALTURA_HORA)).toEqual({
      top: 60,
      height: ALTO_MINIMO_BLOQUE,
    })
  })

  it('applies a minimum height to very short appointments', () => {
    expect(posicionBloque(dia('09:00'), dia('09:05'), RANGO, ALTURA_HORA)?.height).toBe(
      ALTO_MINIMO_BLOQUE,
    )
  })

  it('returns null for invalid dates', () => {
    expect(posicionBloque('nope', dia('10:00'), RANGO, ALTURA_HORA)).toBeNull()
  })
})

describe('desplazamientoAhora', () => {
  it('returns the offset of the current time inside the range', () => {
    expect(desplazamientoAhora(new Date(2026, 5, 1, 10, 30), RANGO, ALTURA_HORA)).toBe(150)
  })

  it('returns null before or after the visible range', () => {
    expect(desplazamientoAhora(new Date(2026, 5, 1, 7, 59), RANGO, ALTURA_HORA)).toBeNull()
    expect(desplazamientoAhora(new Date(2026, 5, 1, 18, 0), RANGO, ALTURA_HORA)).toBeNull()
  })
})

describe('asignarColumnas', () => {
  it('gives a single full-width column to non-overlapping blocks', () => {
    const cols = asignarColumnas([
      { inicio: 540, fin: 600 },
      { inicio: 600, fin: 660 },
    ])
    expect(cols).toEqual([
      { columna: 0, total: 1 },
      { columna: 0, total: 1 },
    ])
  })

  it('splits overlapping blocks into side-by-side columns', () => {
    const cols = asignarColumnas([
      { inicio: 540, fin: 630 },
      { inicio: 570, fin: 660 },
    ])
    expect(cols).toEqual([
      { columna: 0, total: 2 },
      { columna: 1, total: 2 },
    ])
  })

  it('reuses a free column and keeps clusters independent', () => {
    const cols = asignarColumnas([
      { inicio: 540, fin: 600 },
      { inicio: 550, fin: 610 },
      { inicio: 600, fin: 660 },
      { inicio: 900, fin: 960 },
    ])
    expect(cols).toEqual([
      { columna: 0, total: 2 },
      { columna: 1, total: 2 },
      { columna: 0, total: 2 },
      { columna: 0, total: 1 },
    ])
  })

  it('returns results in the original input order', () => {
    const cols = asignarColumnas([
      { inicio: 600, fin: 700 },
      { inicio: 540, fin: 650 },
    ])
    expect(cols).toEqual([
      { columna: 1, total: 2 },
      { columna: 0, total: 2 },
    ])
  })
})
