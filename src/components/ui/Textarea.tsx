import { useId, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  ayuda?: string
  superficie?: 'sand' | 'blanco'
}

export function Textarea({
  label,
  error,
  ayuda,
  superficie = 'sand',
  className = '',
  ...props
}: TextareaProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13px] font-medium text-sage-800">
        {label}
        {props.required && <span className="ml-1 text-clay-500">*</span>}
      </label>

      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={`w-full resize-y rounded-control border px-[13px] py-[11px] text-sm font-normal placeholder:text-sand-500 ${
          superficie === 'blanco' ? 'bg-white' : 'bg-sand-50'
        } ${error ? 'border-clay-400' : 'border-sand-300'} ${className}`}
      />

      {error && <span className="text-xs text-clay-700">{error}</span>}
      {!error && ayuda && <span className="text-xs text-sand-700">{ayuda}</span>}
    </div>
  )
}
