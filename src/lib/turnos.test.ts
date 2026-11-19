import { describe, expect, it } from 'vitest'
import { esTurnoEditable } from './turnos'

describe('esTurnoEditable', () => {
  it('un turno pendiente o confirmado se puede editar', () => {
    expect(esTurnoEditable('PENDIENTE')).toBe(true)
    expect(esTurnoEditable('CONFIRMADO')).toBe(true)
  })

  it('un turno realizado se puede editar, para corregir lo que se cargó mal antes de marcarlo', () => {
    expect(esTurnoEditable('REALIZADO')).toBe(true)
  })

  it('un turno cancelado no se puede editar', () => {
    expect(esTurnoEditable('CANCELADO')).toBe(false)
  })
})
