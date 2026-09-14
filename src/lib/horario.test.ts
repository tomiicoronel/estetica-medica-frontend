import { describe, expect, it } from 'vitest'
import {
  desplazarFin,
  horaAMinutos,
  minutosAHora,
  sugerirFin,
  validarRangoHorario,
} from './horario'

describe('horaAMinutos', () => {
  it('convierte una hora válida a minutos desde medianoche', () => {
    expect(horaAMinutos('00:00')).toBe(0)
    expect(horaAMinutos('09:05')).toBe(545)
    expect(horaAMinutos('23:59')).toBe(1439)
  })

  it('devuelve null si la hora es inválida o está vacía', () => {
    expect(horaAMinutos('')).toBeNull()
    expect(horaAMinutos('24:00')).toBeNull()
    expect(horaAMinutos('12:60')).toBeNull()
    expect(horaAMinutos('abc')).toBeNull()
  })
})

describe('minutosAHora', () => {
  it('convierte minutos desde medianoche a HH:mm', () => {
    expect(minutosAHora(0)).toBe('00:00')
    expect(minutosAHora(545)).toBe('09:05')
    expect(minutosAHora(1439)).toBe('23:59')
  })
})

describe('sugerirFin', () => {
  it('suma la duración total a la hora de inicio', () => {
    expect(sugerirFin('09:00', 30)).toBe('09:30')
    expect(sugerirFin('09:00', 90)).toBe('10:30')
  })

  it('devuelve null si la suma llega o cruza la medianoche', () => {
    expect(sugerirFin('23:30', 30)).toBeNull() // llega exacto a las 00:00
    expect(sugerirFin('23:30', 60)).toBeNull() // cruza
    expect(sugerirFin('00:00', 1440)).toBeNull()
  })

  it('devuelve null si la hora de inicio es inválida o está vacía', () => {
    expect(sugerirFin('', 30)).toBeNull()
    expect(sugerirFin('25:00', 30)).toBeNull()
  })

  it('devuelve null si no hay duración (sin servicios)', () => {
    expect(sugerirFin('09:00', 0)).toBeNull()
    expect(sugerirFin('09:00', -5)).toBeNull()
  })

  it('caso límite: exactamente 12 horas de duración es válido', () => {
    expect(sugerirFin('08:00', 720)).toBe('20:00')
  })
})

describe('desplazarFin', () => {
  it('mantiene la duración actual al mover el inicio', () => {
    expect(desplazarFin('09:00', '10:00', '11:00')).toBe('12:00')
    expect(desplazarFin('09:00', '09:45', '14:00')).toBe('14:45')
  })

  it('devuelve null si el desplazamiento cruza la medianoche', () => {
    expect(desplazarFin('09:00', '10:00', '23:30')).toBeNull()
    expect(desplazarFin('09:00', '10:30', '23:00')).toBeNull()
  })

  it('devuelve null si alguna hora es inválida', () => {
    expect(desplazarFin('', '10:00', '11:00')).toBeNull()
    expect(desplazarFin('09:00', '', '11:00')).toBeNull()
    expect(desplazarFin('09:00', '10:00', '')).toBeNull()
  })

  it('devuelve null si el par inicio/fin actual no es válido (fin <= inicio)', () => {
    expect(desplazarFin('10:00', '10:00', '11:00')).toBeNull()
    expect(desplazarFin('10:00', '09:00', '11:00')).toBeNull()
  })
})

describe('validarRangoHorario', () => {
  it('devuelve null cuando el rango es válido', () => {
    expect(validarRangoHorario('09:00', '10:00')).toBeNull()
  })

  it('exactamente 12 horas es válido', () => {
    expect(validarRangoHorario('08:00', '20:00')).toBeNull()
  })

  it('12 horas y un minuto excede el máximo', () => {
    expect(validarRangoHorario('08:00', '20:01')).toBe(
      'La duración del turno no puede superar las 12 horas.',
    )
  })

  it('el fin igual al inicio no es válido', () => {
    expect(validarRangoHorario('10:00', '10:00')).toBe(
      'La hora de fin tiene que ser posterior a la de inicio.',
    )
  })

  it('el fin anterior al inicio no es válido', () => {
    expect(validarRangoHorario('10:00', '09:00')).toBe(
      'La hora de fin tiene que ser posterior a la de inicio.',
    )
  })

  it('un fin del día siguiente (hora menor) se rechaza como no posterior', () => {
    expect(validarRangoHorario('23:50', '00:10')).toBe(
      'La hora de fin tiene que ser posterior a la de inicio.',
    )
  })

  it('devuelve un mensaje de formato si alguna hora es inválida', () => {
    expect(validarRangoHorario('', '10:00')).toBe(
      'La hora tiene que estar en formato hh:mm, por ejemplo 14:30.',
    )
    expect(validarRangoHorario('09:00', '')).toBe(
      'La hora tiene que estar en formato hh:mm, por ejemplo 14:30.',
    )
  })

  it('caso límite: 23:59 como fin de un turno corto es válido', () => {
    expect(validarRangoHorario('23:58', '23:59')).toBeNull()
  })
})
