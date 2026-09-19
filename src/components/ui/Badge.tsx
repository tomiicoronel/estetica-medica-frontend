import type { EstadoTurno } from '../../types/api'
import { ETIQUETA_ESTADO } from '../../lib/formato'

/**
 * Colores de estado. Salen de los tokens `--color-estado-*` de index.css, que
 * espejan la escala estándar de Tailwind (amber/sky/emerald/rose) y se
 * comparten con la agenda: son semánticos y tienen que leerse como tales.
 */
const ESTILO_ESTADO: Record<EstadoTurno, string> = {
  PENDIENTE: 'bg-estado-pendiente-bg text-estado-pendiente-fg',
  CONFIRMADO: 'bg-estado-confirmado-bg text-estado-confirmado-fg',
  REALIZADO: 'bg-estado-realizado-bg text-estado-realizado-fg',
  CANCELADO: 'bg-estado-cancelado-bg text-estado-cancelado-fg',
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
