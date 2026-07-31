import { useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Mensaje de error del campo (viene de `ApiError.campo(nombre)` en los 400). */
  error?: string
  /** Texto de ayuda debajo del campo. */
  ayuda?: string
}

export function Input({ label, error, ayuda, className = '', ...props }: InputProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13px] font-medium text-sage-800">
        {label}
        {props.required && <span className="ml-1 text-clay-500">*</span>}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={`rounded-control border bg-sand-50 px-[13px] py-[11px] text-sm font-normal placeholder:text-sand-500 ${
          error ? 'border-clay-400' : 'border-sand-300'
        } ${className}`}
      />
      {error && <span className="text-xs text-clay-700">{error}</span>}
      {!error && ayuda && <span className="text-xs text-sand-700">{ayuda}</span>}
    </div>
  )
}
