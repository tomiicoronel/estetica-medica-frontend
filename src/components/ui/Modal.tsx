import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  titulo: string
  subtitulo?: string
  onCerrar: () => void
  children: ReactNode
  /** Botonera del pie. */
  pie?: ReactNode
}

/**
 * Diálogo modal. Hoja inferior por debajo de 860px, panel centrado arriba.
 *
 * Cierra con Escape y con clic en el fondo, bloquea el scroll del documento y
 * lleva el foco adentro al abrirse: sin eso, el tabulador sigue recorriendo la
 * pantalla de atrás mientras el modal tapa todo.
 */
export function Modal({ titulo, subtitulo, onCerrar, children, pie }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)
  const tituloId = useId()

  useEffect(() => {
    function onKeyDown(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }

    document.addEventListener('keydown', onKeyDown)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Primer campo del formulario, o el panel si no hay ninguno.
    const primerCampo = panel.current?.querySelector<HTMLElement>(
      'input, select, textarea, button',
    )
    primerCampo?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowPrevio
    }
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center app:items-center app:p-8">
      <div
        onClick={onCerrar}
        aria-hidden="true"
        className="absolute inset-0 bg-sage-900/35"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="relative flex max-h-[92vh] w-full animate-om-fade flex-col gap-[18px] overflow-auto rounded-t-[22px] bg-sand-50 px-4 pb-[26px] pt-5 app:max-h-[88vh] app:max-w-[620px] app:gap-5 app:rounded-[20px] app:border app:border-sand-200 app:p-[26px]"
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-[5px]">
            <h2 id={tituloId} className="text-[19px] font-semibold tracking-[-0.02em]">
              {titulo}
            </h2>
            {subtitulo && <p className="text-[13px] text-sand-700">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="ml-auto flex size-8 flex-none items-center justify-center rounded-[10px] border border-sand-200 bg-white text-sand-700 transition-colors hover:bg-sand-100"
          >
            ✕
          </button>
        </div>

        {children}

        {pie && <div className="flex flex-col-reverse gap-2.5 app:flex-row app:justify-end">{pie}</div>}
      </div>
    </div>
  )
}
