import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variante = 'primario' | 'secundario' | 'peligro'

const variantes: Record<Variante, string> = {
  primario: 'bg-sage-600 text-white hover:bg-sage-700',
  secundario: 'bg-sand-50 text-sage-800 border border-sand-200 hover:bg-sand-100',
  peligro: 'bg-clay-500 text-white hover:brightness-95',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  /** Muestra spinner y deshabilita. Para mutaciones en curso. */
  cargando?: boolean
  children: ReactNode
}

export function Button({
  variante = 'primario',
  cargando = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled ?? cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantes[variante]} ${className}`}
    >
      {cargando && <Spinner />}
      {children}
    </button>
  )
}
