import type { ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmarModalProps {
  titulo: string
  children: ReactNode
  confirmarLabel?: string
  cancelarLabel?: string
  peligro?: boolean
  cargando?: boolean
  onConfirmar: () => void
  onCerrar: () => void
}

/** Diálogo de confirmación genérico, para no usar `window.confirm`. */
export function ConfirmarModal({
  titulo,
  children,
  confirmarLabel = 'Confirmar',
  cancelarLabel = 'Cancelar',
  peligro = false,
  cargando = false,
  onConfirmar,
  onCerrar,
}: ConfirmarModalProps) {
  return (
    <Modal
      titulo={titulo}
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            {cancelarLabel}
          </Button>
          <Button
            type="button"
            variante={peligro ? 'peligro' : 'primario'}
            cargando={cargando}
            onClick={onConfirmar}
          >
            {confirmarLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-sand-700">{children}</div>
    </Modal>
  )
}
