import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarTurnosDePaciente } from '../../api/endpoints/turnos'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha } from '../../lib/fecha'
import { formatearHora, formatearMonto } from '../../lib/formato'
import type { UUID } from '../../types/api'
import { TurnoDetalleModal } from '../turnos/TurnoDetalleModal'
import { TurnoFormModal } from '../turnos/TurnoFormModal'

interface Props {
  pacienteId: UUID
  nombrePaciente: string
  /** Un paciente archivado no debería recibir turnos nuevos. */
  activo: boolean
}

/** Pestaña "Turnos" de la ficha: historial completo, sin paginar. */
export function TurnosDelPaciente({ pacienteId, nombrePaciente, activo }: Props) {
  const [creando, setCreando] = useState(false)
  const [abierto, setAbierto] = useState<UUID | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const { data: turnos, isPending, error } = useQuery({
    queryKey: ['turnos', 'paciente', pacienteId],
    queryFn: () => listarTurnosDePaciente(pacienteId),
  })

  const turnoAbierto = turnos?.find((t) => t.id === abierto)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-sand-700">
          {turnos ? `${turnos.length} turno${turnos.length === 1 ? '' : 's'}` : ''}
        </span>
        {activo && (
          <Button className="ml-auto" onClick={() => setCreando(true)}>
            Agendar turno
          </Button>
        )}
      </div>

      {isPending && <Skeleton filas={3} />}
      {error && <ErrorDeCarga error={error} />}

      {turnos && turnos.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-sand-50">
          {turnos.map((turno) => (
            <button
              key={turno.id}
              type="button"
              onClick={() => setAbierto(turno.id)}
              className="flex items-center gap-3 border-b border-sand-200/60 px-5 py-[15px] text-left transition-colors last:border-b-0 hover:bg-sage-50"
            >
              <span className="flex w-[120px] flex-none flex-col">
                <span className="text-[13.5px] font-semibold text-sage-800">
                  {formatearFecha(turno.fechaHora)}
                </span>
                <span className="text-xs text-sage-500">
                  {formatearHora(turno.fechaHora)} hs
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-sand-700">
                {turno.servicios.map((s) => s.nombre).join(' · ') || '—'}
              </span>
              <BadgeEstadoTurno estado={turno.estado} />
              <span className="w-[90px] flex-none text-right text-[13.5px] font-semibold text-sage-800">
                {formatearMonto(turno.montoTotal)}
              </span>
            </button>
          ))}
        </div>
      )}

      {turnos && turnos.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-14 text-center">
          <div className="text-sm font-medium">Este paciente todavía no tuvo turnos</div>
          <div className="text-[13px] text-sand-700">
            {activo
              ? 'Agendá el primero desde el botón de arriba.'
              : 'Reactivalo para poder agendarle turnos.'}
          </div>
        </div>
      )}

      {creando && (
        <TurnoFormModal
          pacienteId={pacienteId}
          onCerrar={() => setCreando(false)}
          onListo={(mensaje) => {
            setCreando(false)
            setAviso(mensaje)
          }}
        />
      )}

      {turnoAbierto && (
        <TurnoDetalleModal
          turno={turnoAbierto}
          nombrePaciente={nombrePaciente}
          onCerrar={() => setAbierto(null)}
          onListo={setAviso}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </div>
  )
}
