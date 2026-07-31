import type { ReactNode } from 'react'

interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  /** Acción primaria de la pantalla (el botón verde a la derecha). */
  accion?: ReactNode
}

/**
 * Encabezado sticky de cada pantalla.
 *
 * Lo renderiza la pantalla y no el layout: así la acción primaria puede usar el
 * estado de la pantalla (abrir un modal, por ejemplo) sin pasar callbacks por
 * contexto. Al estar dentro de <main>, el sticky se pega igual al tope.
 */
export function PageHeader({ titulo, subtitulo, accion }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-sand-200 bg-sand-100/95 px-4 py-[13px] backdrop-blur-[8px] app:gap-5 app:px-[34px] app:py-5">
      <div className="flex min-w-0 flex-col gap-[3px]">
        <h1 className="text-[21px] font-semibold tracking-[-0.02em]">{titulo}</h1>
        {subtitulo && <p className="text-[13px] text-sand-700">{subtitulo}</p>}
      </div>
      {accion && <div className="ml-auto flex items-center gap-3">{accion}</div>}
    </header>
  )
}
