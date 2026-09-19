import { useEffect, useMemo, useState } from 'react'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import {
  asignarColumnas,
  desplazamientoAhora,
  posicionBloque,
  rangoHorasVisibles,
} from '../../lib/agendaDia'
import { COLORES_ESTADO } from '../../lib/calendario'
import { formatearHora } from '../../lib/formato'
import type { TurnoResponse } from '../../types/api'

const ALTURA_HORA = 64
/** Blocks shorter than this only have room for the first line. */
const ALTO_CON_DETALLE = 46
const UN_MINUTO_MS = 60_000

function minutosDeInicio(iso: string): number {
  const fecha = new Date(iso)
  return fecha.getHours() * 60 + fecha.getMinutes()
}

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
}

/** Day-view timeline: hour gutter, hour lines and one block per appointment. */
export function AgendaDeHoy({ turnos, nombrePorPaciente }: Props) {
  const ahora = useAhora()
  const rango = useMemo(() => rangoHorasVisibles(turnos), [turnos])

  const bloques = useMemo(() => {
    const columnas = asignarColumnas(
      turnos.map((t) => {
        const inicio = minutosDeInicio(t.fechaHora)
        const duracion = Math.max(0, (Date.parse(t.fechaHoraFin) - Date.parse(t.fechaHora)) / 60000)
        return { inicio, fin: inicio + duracion }
      }),
    )
    return turnos.flatMap((turno, i) => {
      const posicion = posicionBloque(turno.fechaHora, turno.fechaHoraFin, rango, ALTURA_HORA)
      return posicion ? [{ turno, posicion, ...columnas[i] }] : []
    })
  }, [turnos, rango])

  const horas = Array.from(
    { length: rango.horaFin - rango.horaInicio },
    (_, i) => rango.horaInicio + i,
  )
  const lineaAhora = desplazamientoAhora(ahora, rango, ALTURA_HORA)

  return (
    <div className="px-3 py-4 app:px-5">
      <div className="relative" style={{ height: horas.length * ALTURA_HORA }}>
        {horas.map((hora) => (
          <div
            key={hora}
            className="absolute inset-x-0 flex items-start"
            style={{ top: (hora - rango.horaInicio) * ALTURA_HORA }}
          >
            <span className="w-11 flex-none -translate-y-1/2 text-[11.5px] tabular-nums text-sand-500">
              {String(hora).padStart(2, '0')}:00
            </span>
            <span className="h-px flex-1 bg-sand-200" />
          </div>
        ))}

        <div className="absolute inset-y-0 left-12 right-0">
          {bloques.map(({ turno, posicion, columna, total }) => {
            const colores = COLORES_ESTADO[turno.estado]
            const servicios = turno.servicios.map((s) => s.nombre).join(', ')
            return (
              <div
                key={turno.id}
                className="absolute min-w-0 overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5"
                style={{
                  top: posicion.top,
                  height: posicion.height,
                  left: `calc(${(columna / total) * 100}% + 4px)`,
                  width: `calc(${100 / total}% - 8px)`,
                  backgroundColor: colores.backgroundColor,
                  color: colores.color,
                  borderLeftColor: colores.linea,
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${
                      turno.estado === 'CANCELADO' ? 'line-through' : ''
                    }`}
                  >
                    {nombrePorPaciente.get(turno.pacienteId) ?? 'Paciente'}
                  </span>
                  <span className="flex-none rounded-full bg-white/70">
                    <BadgeEstadoTurno estado={turno.estado} />
                  </span>
                </div>
                {posicion.height >= ALTO_CON_DETALLE && (
                  <div className="truncate text-[11.5px] opacity-80">
                    {formatearHora(turno.fechaHora)} – {formatearHora(turno.fechaHoraFin)}
                    {servicios && ` · ${servicios}`}
                  </div>
                )}
              </div>
            )
          })}

          {lineaAhora !== null && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: lineaAhora, color: 'var(--color-clay-500)' }}
            >
              <span className="-ml-1 size-2 flex-none rounded-full bg-current" />
              <span className="h-px flex-1 bg-current" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
