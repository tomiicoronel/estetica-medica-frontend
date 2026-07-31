import { useId } from 'react'

interface CampoHoraProps {
  label: string
  /** `HH:mm`. `''` = vacío. */
  value: string
  onChange: (hora: string) => void
  error?: string
  ayuda?: string
  required?: boolean
  superficie?: 'sand' | 'blanco'
}

/**
 * Va armando `HH:mm` mientras se tipea, sobre los dígitos, para que el borrado
 * no pelee con los dos puntos.
 */
function enmascarar(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '').slice(0, 4)
  if (digitos.length <= 2) return digitos
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`
}

/**
 * Campo de hora tipeable, sin desplegable.
 *
 * Por el mismo motivo que `CampoFecha`: el desplegable del `<input type="time">`
 * lo dibuja el navegador y no se puede tematizar. Para una agenda, además,
 * escribir "1430" es más rápido que recorrer una lista de horarios.
 */
export function CampoHora({
  label,
  value,
  onChange,
  error,
  ayuda,
  required,
  superficie = 'sand',
}: CampoHoraProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13px] font-medium text-sage-800">
        {label}
        {required && <span className="ml-1 text-clay-500">*</span>}
      </label>

      <input
        id={id}
        value={value}
        onChange={(e) => onChange(enmascarar(e.target.value))}
        required={required}
        inputMode="numeric"
        placeholder="hh:mm"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-control border px-[13px] py-[11px] text-sm font-normal placeholder:text-sand-500 ${
          superficie === 'blanco' ? 'bg-white' : 'bg-sand-50'
        } ${error ? 'border-clay-400' : 'border-sand-300'}`}
      />

      {error && <span className="text-xs text-clay-700">{error}</span>}
      {!error && ayuda && <span className="text-xs text-sand-700">{ayuda}</span>}
    </div>
  )
}
