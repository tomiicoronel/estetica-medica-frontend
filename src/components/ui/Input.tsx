import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Mensaje de error del campo (viene de `ApiError.campo(nombre)` en los 400). */
  error?: string
  /** Texto de ayuda debajo del campo. */
  ayuda?: string
  /**
   * Fondo del campo. `sand` sobre el fondo de la app; `blanco` cuando el input
   * va dentro de una tarjeta sand-50, donde si no se confundiría con ella.
   */
  superficie?: 'sand' | 'blanco'
  /** Control embebido al final del campo (por ejemplo, el ojito de PasswordInput). */
  sufijo?: ReactNode
}

export function Input({
  label,
  error,
  ayuda,
  superficie = 'sand',
  sufijo,
  className = '',
  ...props
}: InputProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13px] font-medium text-sage-800">
        {label}
        {props.required && <span className="ml-1 text-clay-500">*</span>}
      </label>

      <div className="relative flex">
        <input
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-control border py-[11px] pl-[13px] text-sm font-normal placeholder:text-sand-500 ${
            sufijo ? 'pr-11' : 'pr-[13px]'
          } ${superficie === 'blanco' ? 'bg-white' : 'bg-sand-50'} ${
            error ? 'border-clay-400' : 'border-sand-300'
          } ${className}`}
        />
        {sufijo && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{sufijo}</div>
        )}
      </div>

      {error && <span className="text-xs text-clay-700">{error}</span>}
      {!error && ayuda && <span className="text-xs text-sand-700">{ayuda}</span>}
    </div>
  )
}
