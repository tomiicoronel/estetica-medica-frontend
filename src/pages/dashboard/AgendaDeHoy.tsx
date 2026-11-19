import { useEffect, useMemo, useState } from 'react'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { armarAgendaDelDia } from '../../lib/agendaDia'
import { COLORES_ESTADO } from '../../lib/calendario'
import { formatearDuracion, formatearHora } from '../../lib/formato'
import type { TurnoResponse } from '../../types/api'

const UN_MINUTO_MS = 60_000

function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), UN_MINUTO_MS)
    return () => window.clearInterval(id)
  }, [])
  return ahora
}

interface Props {
  turnos: TurnoResponse[]
  nombrePorPaciente: Map<string, string>
  /** Opens the appointment detail, the same one the Turnos page uses. */
  onAbrir: (turnoId: string) => void
}

/**
 * Today's appointments as a chronological list: one row per appointment with
 * its time, patient, services and state. Unlike a proportional time grid, rows
 * never overlap however short or packed the appointments are. The full grid
 * lives in the Turnos page.
 */
export function AgendaDeHoy({ turnos, nombrePorPaciente, onAbrir }: Props) {
  const ahora = useAhora()
  const { filas, indiceAhora } = useMemo(() => armarAgendaDelDia(turnos, ahora), [turnos, ahora])

  return (
    // role="list": Safari drops list semantics from styled lists.
    <ol role="list" className="flex flex-col px-3 py-2 app:px-5">
      {filas.map(({ turno, pasado, enCurso, duracionMinutos }, i) => {
        const servicios = turno.servicios.map((s) => s.nombre).join(' · ') || 'Sin servicios'
        const cancelado = turno.estado === 'CANCELADO'

        return (
          <li key={turno.id} className="flex flex-col">
            {i === indiceAhora && (
              <div
                aria-hidden="true"
                className="flex items-center gap-2 py-1.5 text-[11.5px] font-semibold tabular-nums"
                style={{ color: 'var(--color-clay-500)' }}
              >
                <span className="size-2 flex-none rounded-full bg-current" />
                Ahora ·{' '}
                {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                <span className="h-px flex-1 bg-current" />
              </div>
            )}

            <button
              type="button"
              onClick={() => onAbrir(turno.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-sage-500 ${
                enCurso ? 'bg-sage-50' : ''
              } ${pasado ? 'opacity-55' : ''} ${
                i > 0 && i !== indiceAhora ? 'border-t border-sand-200' : ''
              }`}
            >
              <div className="flex w-14 flex-none flex-col tabular-nums">
                <time dateTime={turno.fechaHora} className="text-[14px] font-semibold text-sage-800">
                  {formatearHora(turno.fechaHora)}
                </time>
                {duracionMinutos > 0 && (
                  <span className="text-[11.5px] text-sand-500">
                    {formatearDuracion(duracionMinutos)}
                  </span>
                )}
              </div>

              <span
                aria-hidden="true"
                className="h-9 w-[3px] flex-none rounded-full"
                style={{ backgroundColor: COLORES_ESTADO[turno.estado].linea }}
              />

              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className={`truncate text-[14px] font-semibold text-sage-800 ${
                    cancelado ? 'line-through' : ''
                  }`}
                >
                  {nombrePorPaciente.get(turno.pacienteId) ?? 'Paciente'}
                  {enCurso && <span className="sr-only"> (en curso)</span>}
                  {pasado && <span className="sr-only"> (terminado)</span>}
                </span>
                <span className="truncate text-[12.5px] text-sand-700">{servicios}</span>
              </div>

              {enCurso && (
                <span className="hidden flex-none text-[11.5px] font-semibold text-sage-700 app:inline">
                  En curso
                </span>
              )}
              <BadgeEstadoTurno estado={turno.estado} />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
