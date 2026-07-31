import { useEffect } from 'react'

/**
 * Aviso efímero de una acción exitosa.
 *
 * Fondo sólido, no translúcido: que el toast se viera semitransparente fue uno
 * de los bugs reportados del front anterior.
 */
export function Toast({ mensaje, onCerrar }: { mensaje: string; onCerrar: () => void }) {
  useEffect(() => {
    const id = setTimeout(onCerrar, 4000)
    return () => clearTimeout(id)
  }, [onCerrar, mensaje])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-5 z-90 rounded-[13px] bg-sage-800 px-[18px] py-[14px] text-[13.5px] font-medium text-sage-50 shadow-[0_12px_28px_rgba(61,70,58,.28)] app:inset-x-auto app:left-1/2 app:-translate-x-1/2"
    >
      {mensaje}
    </div>
  )
}
