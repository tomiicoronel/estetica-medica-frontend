/**
 * El backend manda LocalDateTime sin zona ("2026-06-01T10:30:00"), que el
 * navegador interpreta como hora local. Es lo correcto acá: el backend ya
 * trabaja en America/Argentina/Buenos_Aires.
 */

const FECHA_CORTA = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatearFecha(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? '—' : FECHA_CORTA.format(fecha)
}

export function iniciales(nombre: string, apellido: string): string {
  const letras = `${nombre[0] ?? ''}${apellido[0] ?? ''}`.trim()
  return letras === '' ? '—' : letras.toUpperCase()
}
