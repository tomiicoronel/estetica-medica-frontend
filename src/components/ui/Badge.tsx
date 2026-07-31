import type { EstadoTurno } from '../../types/api'
import { ETIQUETA_ESTADO } from '../../lib/formato'

/**
 * Colores de estado. paleta.md los define sobre la escala estándar de
 * Tailwind (amber/sky/emerald/rose), no sobre los tokens de marca: son
 * semánticos y tienen que leerse como tales.
 */
const ESTILO_ESTADO: Record<EstadoTurno, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  CONFIRMADO: 'bg-sky-100 text-sky-800',
  REALIZADO: 'bg-emerald-100 text-emerald-800',
  CANCELADO: 'bg-rose-100 text-rose-800',
}

export function BadgeEstadoTurno({ estado }: { estado: EstadoTurno }) {
  return (
    <span
      className={`inline-flex flex-none items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ESTILO_ESTADO[estado]}`}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}
