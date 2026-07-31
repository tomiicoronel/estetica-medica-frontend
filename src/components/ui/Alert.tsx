import type { ReactNode } from 'react'

/**
 * Bloque de error de formulario. Fondo sólido a propósito: uno de los bugs
 * reportados del front anterior era que el aviso de error se veía semitransparente.
 */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-control border border-clay-400 bg-clay-100 px-[14px] py-3 text-[13px] leading-relaxed text-clay-700"
    >
      {children}
    </div>
  )
}
