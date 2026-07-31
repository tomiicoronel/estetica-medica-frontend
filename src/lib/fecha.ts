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

/**
 * Edad a partir de la fecha de nacimiento (`LocalDate`, "1990-05-20").
 *
 * Se ancla al mediodía porque `new Date('1990-05-20')` se parsea como UTC y en
 * Argentina (UTC-3) cae el día anterior, lo que corre la edad un día entero.
 */
export function edad(fechaNacimiento?: string): string {
  if (!fechaNacimiento) return 'Sin fecha de nacimiento'

  const nacimiento = new Date(`${fechaNacimiento}T12:00:00`)
  if (Number.isNaN(nacimiento.getTime())) return '—'

  const hoy = new Date()
  let anios = hoy.getFullYear() - nacimiento.getFullYear()
  const meses = hoy.getMonth() - nacimiento.getMonth()
  if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) anios--

  return `${anios} años`
}

export function iniciales(nombre: string, apellido: string): string {
  const letras = `${nombre[0] ?? ''}${apellido[0] ?? ''}`.trim()
  return letras === '' ? '—' : letras.toUpperCase()
}
