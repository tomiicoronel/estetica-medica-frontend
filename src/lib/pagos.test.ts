import { describe, expect, it } from 'vitest'
import {
  cuentaEnCaja,
  esMetodoExento,
  etiquetaMovimiento,
  metodosDisponibles,
  puedeRegistrarPago,
  sumarCobrado,
  sumarCubiertoSinCobro,
  validarMontoContraDeuda,
} from './pagos'

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

describe('puedeRegistrarPago', () => {
  it('se puede pagar si el turno tiene deuda', () => {
    expect(puedeRegistrarPago({ tieneDeuda: true }, 2)).toBe(true)
  })

  it('un turno sin servicios acepta pagos aunque no tenga deuda (seña para reservar)', () => {
    expect(puedeRegistrarPago({ tieneDeuda: false }, 0)).toBe(true)
  })

  it('un turno con servicios ya saldado no ofrece registrar pago', () => {
    expect(puedeRegistrarPago({ tieneDeuda: false }, 1)).toBe(false)
  })
})

describe('validarMontoContraDeuda', () => {
  it('con servicios, rechaza un monto mayor a la deuda', () => {
    expect(validarMontoContraDeuda(15000, 10000, false)).toMatch(/no puede superar la deuda/)
  })

  it('con servicios, acepta un monto igual a la deuda', () => {
    expect(validarMontoContraDeuda(10000, 10000, false)).toBeNull()
  })

  it('sin servicios, acepta cualquier monto aunque la deuda sea 0', () => {
    expect(validarMontoContraDeuda(5000, 0, true)).toBeNull()
  })
})

describe('metodosDisponibles', () => {
  it('con deuda ofrece los métodos de dinero, canje y sin cargo', () => {
    expect(metodosDisponibles(10000)).toEqual([
      'EFECTIVO',
      'TRANSFERENCIA',
      'MERCADO_PAGO',
      'CANJE',
      'SIN_CARGO',
    ])
  })

  it('sin deuda oculta canje y sin cargo, porque no hay nada que eximir', () => {
    expect(metodosDisponibles(0)).toEqual(['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO'])
  })
})

describe('movimientos de saldo a favor', () => {
  it('DEVOLUCION cuenta en caja (resta) y TRASLADO no', () => {
    expect(cuentaEnCaja('DEVOLUCION')).toBe(true)
    expect(cuentaEnCaja('TRASLADO')).toBe(false)
    expect(cuentaEnCaja('EFECTIVO')).toBe(true)
    expect(cuentaEnCaja('CANJE')).toBe(false)
  })

  it('DEVOLUCION y TRASLADO no son métodos exentos de deuda', () => {
    expect(esMetodoExento('DEVOLUCION')).toBe(false)
    expect(esMetodoExento('TRASLADO')).toBe(false)
  })

  it('sumarCobrado resta las devoluciones e ignora los traslados', () => {
    const pagos = [
      { metodo: 'EFECTIVO' as const, monto: 10000 },
      { metodo: 'DEVOLUCION' as const, monto: -4000 },
      // Solo la mitad saliente, como en la lista de pagos de un turno.
      { metodo: 'TRASLADO' as const, monto: -6000 },
    ]
    expect(sumarCobrado(pagos)).toBe(6000)
  })

  it('sumarCubiertoSinCobro no incluye devoluciones ni traslados', () => {
    expect(
      sumarCubiertoSinCobro([
        { metodo: 'SIN_CARGO', monto: 3000 },
        { metodo: 'DEVOLUCION', monto: -1000 },
        { metodo: 'TRASLADO', monto: 2000 },
      ]),
    ).toBe(3000)
  })

  it('etiqueta un traslado saliente con la fecha del turno destino', () => {
    expect(
      etiquetaMovimiento({
        metodo: 'TRASLADO',
        monto: -6000,
        turnoRelacionadoFechaHora: '2026-12-15T10:00:00',
      }),
    ).toBe('Traslado al turno del 15/12/2026')
  })

  it('etiqueta un traslado entrante con la fecha del turno origen', () => {
    expect(
      etiquetaMovimiento({
        metodo: 'TRASLADO',
        monto: 6000,
        turnoRelacionadoFechaHora: '2026-11-20T09:30:00',
      }),
    ).toBe('Traslado desde el turno del 20/11/2026')
  })

  it('el resto de los métodos usa su etiqueta normal', () => {
    expect(etiquetaMovimiento({ metodo: 'DEVOLUCION', monto: -4000 })).toBe('Devolución')
    expect(etiquetaMovimiento({ metodo: 'EFECTIVO', monto: 4000 })).toBe('Efectivo')
  })
})
