import { describe, expect, it } from 'vitest'
import { armarAgendaDelDia, asignarColumnas } from './agendaDia'

const dia = (hora: string) => `2026-06-01T${hora}:00`
const turno = (id: string, inicio: string, fin: string) => ({
  id,
  fechaHora: dia(inicio),
  fechaHoraFin: dia(fin),
})
const a = (hora: string) => new Date(dia(hora))

describe('armarAgendaDelDia', () => {
  it('ordena los turnos por hora de inicio', () => {
    const { filas } = armarAgendaDelDia(
      [turno('c', '15:20', '15:40'), turno('a', '12:45', '13:05'), turno('b', '13:05', '13:25')],
      a('08:00'),
    )
    expect(filas.map((f) => f.turno.id)).toEqual(['a', 'b', 'c'])
  })

  it('calcula la duración en minutos', () => {
    const { filas } = armarAgendaDelDia([turno('a', '13:05', '13:25')], a('08:00'))
    expect(filas[0].duracionMinutos).toBe(20)
  })

  it('marca como pasados los turnos que ya terminaron y en curso el que está ocurriendo', () => {
    const { filas } = armarAgendaDelDia(
      [turno('a', '12:00', '12:20'), turno('b', '12:20', '12:40'), turno('c', '13:00', '13:20')],
      a('12:30'),
    )
    expect(filas.map((f) => [f.turno.id, f.pasado, f.enCurso])).toEqual([
      ['a', true, false],
      ['b', false, true],
      ['c', false, false],
    ])
  })

  it('pone la marca de ahora antes del primer turno que no terminó', () => {
    const { indiceAhora } = armarAgendaDelDia(
      [turno('a', '09:00', '09:20'), turno('b', '10:00', '10:20'), turno('c', '13:00', '13:20')],
      a('11:00'),
    )
    expect(indiceAhora).toBe(2)
  })

  it('no muestra la marca si todavía no terminó ningún turno ni si ya terminaron todos', () => {
    const turnos = [turno('a', '09:00', '09:20'), turno('b', '10:00', '10:20')]
    expect(armarAgendaDelDia(turnos, a('08:00')).indiceAhora).toBeNull()
    expect(armarAgendaDelDia(turnos, a('18:00')).indiceAhora).toBeNull()
  })

  it('un turno sin fin válido no rompe la agenda', () => {
    const { filas } = armarAgendaDelDia(
      [{ id: 'x', fechaHora: dia('09:00'), fechaHoraFin: 'nope' }],
      a('10:00'),
    )
    expect(filas[0]).toMatchObject({ duracionMinutos: 0, pasado: false })
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
