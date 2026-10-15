import { describe, expect, it } from 'vitest'
import { esMetodoExento, sumarCobrado, sumarCubiertoSinCobro } from './pagos'

describe('esMetodoExento', () => {
  it('CANJE y SIN_CARGO son exentos', () => {
    expect(esMetodoExento('CANJE')).toBe(true)
    expect(esMetodoExento('SIN_CARGO')).toBe(true)
  })

  it('los métodos de dinero no son exentos', () => {
    expect(esMetodoExento('EFECTIVO')).toBe(false)
    expect(esMetodoExento('TRANSFERENCIA')).toBe(false)
    expect(esMetodoExento('MERCADO_PAGO')).toBe(false)
  })
})

describe('sumarCobrado / sumarCubiertoSinCobro', () => {
  const pagos = [
    { metodo: 'EFECTIVO' as const, monto: 100 },
    { metodo: 'MERCADO_PAGO' as const, monto: 50 },
    { metodo: 'CANJE' as const, monto: 30 },
    { metodo: 'SIN_CARGO' as const, monto: 20 },
  ]

  it('sumarCobrado ignora los pagos exentos', () => {
    expect(sumarCobrado(pagos)).toBe(150)
  })

  it('sumarCubiertoSinCobro suma solo los exentos', () => {
    expect(sumarCubiertoSinCobro(pagos)).toBe(50)
  })

  it('lista vacía suma 0', () => {
    expect(sumarCobrado([])).toBe(0)
    expect(sumarCubiertoSinCobro([])).toBe(0)
  })
})
