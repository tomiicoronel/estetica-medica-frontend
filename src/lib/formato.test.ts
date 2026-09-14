import { describe, expect, it } from 'vitest'
import { formatearDuracion } from './formato'

describe('formatearDuracion', () => {
  it('menos de una hora: "N min"', () => {
    expect(formatearDuracion(5)).toBe('5 min')
    expect(formatearDuracion(59)).toBe('59 min')
  })

  it('una hora exacta: "1 h"', () => {
    expect(formatearDuracion(60)).toBe('1 h')
  })

  it('una hora y minutos: "1 h N min"', () => {
    expect(formatearDuracion(61)).toBe('1 h 1 min')
    expect(formatearDuracion(90)).toBe('1 h 30 min')
  })

  it('más de una hora exacta: "N h"', () => {
    expect(formatearDuracion(120)).toBe('2 h')
    expect(formatearDuracion(720)).toBe('12 h')
  })

  it('valores inválidos devuelven el placeholder de dato faltante', () => {
    expect(formatearDuracion(Number.NaN)).toBe('—')
    expect(formatearDuracion(Number.POSITIVE_INFINITY)).toBe('—')
    expect(formatearDuracion(Number.NEGATIVE_INFINITY)).toBe('—')
    expect(formatearDuracion(-1)).toBe('—')
    expect(formatearDuracion(-60)).toBe('—')
  })
})
