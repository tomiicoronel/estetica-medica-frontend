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

/**
 * Sirve para `LocalDateTime` y para `LocalDate`.
 *
 * Un `LocalDate` suelto ("2001-08-06") lo parsea el navegador como medianoche
 * UTC, que en Argentina (UTC-3) cae el día anterior: la fecha se mostraba
 * corrida un día. Anclarlo al mediodía lo deja siempre en su fecha. Los
 * `LocalDateTime` ya traen hora y se parsean como local, así que van tal cual.
 */
export function formatearFecha(iso: string): string {
  const conHora = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso
  const fecha = new Date(conHora)
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
