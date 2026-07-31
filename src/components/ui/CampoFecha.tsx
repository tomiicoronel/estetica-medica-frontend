import { useEffect, useId, useRef, useState } from 'react'

interface CampoFechaProps {
  label: string
  /** Valor en ISO (`yyyy-mm-dd`), que es lo que espera la API. `''` = vacío. */
  value: string
  onChange: (iso: string) => void
  error?: string
  ayuda?: string
  required?: boolean
  superficie?: 'sand' | 'blanco'
  /** Año más viejo ofrecido en el selector. */
  anioMinimo?: number
  /** Año más nuevo ofrecido. */
  anioMaximo?: number
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** La semana arranca el lunes, como en Argentina. */
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function pad(numero: number): string {
  return String(numero).padStart(2, '0')
}

function diasDelMes(anio: number, mes: number): number {
  // Día 0 del mes siguiente = último día de éste.
  return new Date(anio, mes + 1, 0).getDate()
}

/** `getDay()` cuenta desde domingo; acá el lunes es la columna 0. */
function offsetPrimerDia(anio: number, mes: number): number {
  return (new Date(anio, mes, 1).getDay() + 6) % 7
}

/** `2026-07-31` → `31/07/2026`. */
function isoATexto(iso: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : ''
}

/** `31/07/2026` → `2026-07-31`. Devuelve `''` si no es una fecha real. */
function textoAIso(texto: string): string {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (!partes) return ''

  const dia = Number(partes[1])
  const mes = Number(partes[2])
  const anio = Number(partes[3])

  if (mes < 1 || mes > 12) return ''
  if (dia < 1 || dia > diasDelMes(anio, mes - 1)) return ''

  return `${partes[3]}-${partes[2]}-${partes[1]}`
}

/**
 * Va armando `dd/mm/aaaa` mientras se tipea.
 *
 * Trabaja sobre los dígitos y reconstruye las barras, así el borrado no pelea
 * con el separador: borrar sobre "31/" deja "31" y no vuelve a meter la barra.
 */
function enmascarar(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '').slice(0, 8)
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)]
    .filter((parte) => parte !== '')
    .join('/')
}

/**
 * Campo de fecha con calendario propio.
 *
 * El `<input type="date">` nativo no se puede tematizar: el panel del calendario
 * lo dibuja el navegador y ninguna regla CSS lo alcanza. Como la fecha aparece
 * en turnos, bloqueos y fichas, el calendario se dibuja acá con los tokens de la
 * paleta. Se puede tipear a mano (dd/mm/aaaa), que para fechas de nacimiento es
 * más rápido que navegar meses.
 */
export function CampoFecha({
  label,
  value,
  onChange,
  error,
  ayuda,
  required,
  superficie = 'sand',
  anioMinimo,
  anioMaximo,
}: CampoFechaProps) {
  const id = useId()
  const contenedor = useRef<HTMLDivElement>(null)

  const [texto, setTexto] = useState(() => isoATexto(value))
  const [abierto, setAbierto] = useState(false)

  const hoy = new Date()
  const desde = anioMinimo ?? hoy.getFullYear() - 110
  const hasta = anioMaximo ?? hoy.getFullYear() + 5

  // Mes que está mirando el calendario, independiente del valor elegido.
  const [visible, setVisible] = useState(() => mesInicial(value, hoy))

  // El valor puede cambiar desde afuera (un reset del formulario, por ejemplo).
  // Sólo se re-sincroniza si no es el que ya estamos mostrando, para no pisar lo
  // que la persona está tipeando.
  useEffect(() => {
    if (textoAIso(texto) !== value) setTexto(isoATexto(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!abierto) return

    function onMouseDown(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [abierto])

  function escribir(entrada: string) {
    const enmascarado = enmascarar(entrada)
    setTexto(enmascarado)

    const iso = textoAIso(enmascarado)
    // Vaciar el campo es una acción válida: el campo es opcional.
    if (iso !== '' || enmascarado === '') {
      onChange(iso)
      if (iso !== '') setVisible({ anio: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) - 1 })
    }
  }

  function abrir() {
    setVisible(mesInicial(value, hoy))
    setAbierto(true)
  }

  function elegir(anio: number, mes: number, dia: number) {
    const iso = `${anio}-${pad(mes + 1)}-${pad(dia)}`
    setTexto(isoATexto(iso))
    onChange(iso)
    setAbierto(false)
  }

  function limpiar() {
    setTexto('')
    onChange('')
    setAbierto(false)
  }

  function moverMes(delta: number) {
    const fecha = new Date(visible.anio, visible.mes + delta, 1)
    setVisible({ anio: fecha.getFullYear(), mes: fecha.getMonth() })
  }

  // Escape cierra el calendario sin cerrar el modal que lo contiene: el Modal
  // escucha en `document`, así que hay que frenar la propagación acá.
  function onKeyDown(evento: React.KeyboardEvent) {
    if (evento.key === 'Escape' && abierto) {
      evento.stopPropagation()
      setAbierto(false)
    }
  }

  const seleccionado = textoAIso(texto)

  return (
    <div className="flex flex-col gap-[7px]" ref={contenedor} onKeyDown={onKeyDown}>
      <label htmlFor={id} className="text-[13px] font-medium text-sage-800">
        {label}
        {required && <span className="ml-1 text-clay-500">*</span>}
      </label>

      <div className="relative flex">
        <input
          id={id}
          value={texto}
          onChange={(e) => escribir(e.target.value)}
          onFocus={() => setAbierto(false)}
          required={required}
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-control border py-[11px] pl-[13px] pr-11 text-sm font-normal placeholder:text-sand-500 ${
            superficie === 'blanco' ? 'bg-white' : 'bg-sand-50'
          } ${error ? 'border-clay-400' : 'border-sand-300'}`}
        />

        <button
          type="button"
          onClick={() => (abierto ? setAbierto(false) : abrir())}
          aria-label={abierto ? 'Cerrar calendario' : 'Abrir calendario'}
          aria-expanded={abierto}
          className="absolute inset-y-0 right-0 my-1 mr-1 flex w-9 items-center justify-center rounded-[9px] text-sand-700 transition-colors hover:bg-sage-100 hover:text-sage-800"
        >
          <IconoCalendario />
        </button>

        {abierto && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-10 w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl border border-sand-200 bg-sand-50 p-3 shadow-lg shadow-sage-900/15">
            <div className="flex items-center gap-1.5">
              <FlechaMes direccion="anterior" onClick={() => moverMes(-1)} />

              <select
                value={visible.mes}
                onChange={(e) => setVisible({ ...visible, mes: Number(e.target.value) })}
                aria-label="Mes"
                className="min-w-0 flex-1 rounded-[9px] border border-sand-300 bg-white px-2 py-1.5 text-[13px] font-medium text-sage-800"
              >
                {MESES.map((mes, i) => (
                  <option key={mes} value={i}>
                    {mes}
                  </option>
                ))}
              </select>

              <select
                value={visible.anio}
                onChange={(e) => setVisible({ ...visible, anio: Number(e.target.value) })}
                aria-label="Año"
                className="rounded-[9px] border border-sand-300 bg-white px-2 py-1.5 text-[13px] font-medium text-sage-800"
              >
                {anios(desde, hasta).map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>

              <FlechaMes direccion="siguiente" onClick={() => moverMes(1)} />
            </div>

            <div className="mt-3 grid grid-cols-7 gap-y-1">
              {DIAS_SEMANA.map((dia, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="py-1 text-center text-[11px] font-semibold uppercase text-sand-500"
                >
                  {dia}
                </span>
              ))}

              {Array.from({ length: offsetPrimerDia(visible.anio, visible.mes) }, (_, i) => (
                <span key={`hueco-${i}`} />
              ))}

              {Array.from({ length: diasDelMes(visible.anio, visible.mes) }, (_, i) => {
                const dia = i + 1
                const iso = `${visible.anio}-${pad(visible.mes + 1)}-${pad(dia)}`
                const esSeleccionado = iso === seleccionado
                const esHoy =
                  dia === hoy.getDate() &&
                  visible.mes === hoy.getMonth() &&
                  visible.anio === hoy.getFullYear()

                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => elegir(visible.anio, visible.mes, dia)}
                    aria-current={esHoy ? 'date' : undefined}
                    aria-pressed={esSeleccionado}
                    className={`mx-auto flex size-9 items-center justify-center rounded-[10px] text-[13px] transition-colors ${
                      esSeleccionado
                        ? 'bg-sage-600 font-semibold text-white'
                        : esHoy
                          ? 'border border-sage-300 font-semibold text-sage-800 hover:bg-sage-100'
                          : 'text-sage-800 hover:bg-sage-100'
                    }`}
                  >
                    {dia}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex gap-2 border-t border-sand-200 pt-2.5">
              <button
                type="button"
                onClick={() => elegir(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())}
                className="rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-semibold text-sage-700 transition-colors hover:bg-sage-100"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={limpiar}
                className="ml-auto rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-semibold text-sand-700 transition-colors hover:bg-sand-100"
              >
                Borrar
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <span className="text-xs text-clay-700">{error}</span>}
      {!error && ayuda && <span className="text-xs text-sand-700">{ayuda}</span>}
    </div>
  )
}

function mesInicial(value: string, hoy: Date): { anio: number; mes: number } {
  const iso = /^(\d{4})-(\d{2})-\d{2}$/.exec(value)
  return iso
    ? { anio: Number(iso[1]), mes: Number(iso[2]) - 1 }
    : { anio: hoy.getFullYear(), mes: hoy.getMonth() }
}

/** Del más nuevo al más viejo: para fechas de nacimiento se baja, no se sube. */
function anios(desde: number, hasta: number): number[] {
  return Array.from({ length: hasta - desde + 1 }, (_, i) => hasta - i)
}

function FlechaMes({
  direccion,
  onClick,
}: {
  direccion: 'anterior' | 'siguiente'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direccion === 'anterior' ? 'Mes anterior' : 'Mes siguiente'}
      className="flex size-8 flex-none items-center justify-center rounded-[9px] border border-sand-300 bg-white text-[13px] text-sage-700 transition-colors hover:bg-sage-50"
    >
      {direccion === 'anterior' ? '‹' : '›'}
    </button>
  )
}

function IconoCalendario() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
