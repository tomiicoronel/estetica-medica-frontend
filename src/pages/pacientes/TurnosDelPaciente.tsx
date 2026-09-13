import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarTurnosDePaciente } from '../../api/endpoints/turnos'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha } from '../../lib/fecha'
import { formatearHora, formatearMonto } from '../../lib/formato'
import type { SesionClinicaResponse, TurnoResponse, UUID } from '../../types/api'
import { PagoFormModal } from '../pagos/PagoFormModal'
import { SesionFormModal } from '../sesiones/SesionFormModal'
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
  const [editando, setEditando] = useState<TurnoResponse | null>(null)
  const [abierto, setAbierto] = useState<UUID | null>(null)
  const [mostrarCancelados, setMostrarCancelados] = useState(false)
  const [sesionDe, setSesionDe] = useState<{
    turnoId: UUID
    sesion: SesionClinicaResponse | undefined
  } | null>(null)
  const [pagoDe, setPagoDe] = useState<{ turnoId: UUID; deuda: number } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const { data: turnos, isPending, error } = useQuery({
    queryKey: ['turnos', 'paciente', pacienteId],
    queryFn: () => listarTurnosDePaciente(pacienteId),
  })

  const turnoAbierto = turnos?.find((t) => t.id === abierto)

  const cantidadCancelados = useMemo(
    () => (turnos ?? []).filter((t) => t.estado === 'CANCELADO').length,
    [turnos],
  )

  const turnosVisibles = useMemo(
    () => (turnos ?? []).filter((t) => mostrarCancelados || t.estado !== 'CANCELADO'),
    [turnos, mostrarCancelados],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-sand-700">
          {turnos ? `${turnos.length} turno${turnos.length === 1 ? '' : 's'}` : ''}
        </span>
        {cantidadCancelados > 0 && (
          <button
            type="button"
            onClick={() => setMostrarCancelados((previo) => !previo)}
            className="text-[12.5px] font-semibold text-sage-700 underline transition-colors hover:text-sage-800"
          >
            {mostrarCancelados ? 'Ocultar cancelados' : `Mostrar cancelados (${cantidadCancelados})`}
          </button>
        )}
        {activo && (
          <Button className="ml-auto" onClick={() => setCreando(true)}>
            Agendar turno
          </Button>
        )}
      </div>

      {isPending && <Skeleton filas={3} />}
      {error && <ErrorDeCarga error={error} />}

      {turnos && turnos.length > 0 && turnosVisibles.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-sand-50">
          {turnosVisibles.map((turno) => (
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

      {turnos && turnos.length > 0 && turnosVisibles.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-14 text-center">
          <div className="text-sm font-medium">Todos los turnos están cancelados</div>
          <div className="text-[13px] text-sand-700">Tocá "Mostrar cancelados" para verlos.</div>
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
          onSesion={(sesion) => {
            setSesionDe({ turnoId: turnoAbierto.id, sesion })
            setAbierto(null)
          }}
          onPago={(deuda) => {
            setPagoDe({ turnoId: turnoAbierto.id, deuda })
            setAbierto(null)
          }}
          onEditar={(turno) => {
            setEditando(turno)
            setAbierto(null)
          }}
          onEliminado={(mensaje) => {
            setAbierto(null)
            setAviso(mensaje)
          }}
        />
      )}

      {editando && (
        <TurnoFormModal
          turno={editando}
          onCerrar={() => setEditando(null)}
          onListo={(mensaje) => {
            setEditando(null)
            setAviso(mensaje)
          }}
        />
      )}

      {pagoDe && (
        <PagoFormModal
          turnoId={pagoDe.turnoId}
          deuda={pagoDe.deuda}
          onCerrar={() => setPagoDe(null)}
          onListo={(mensaje) => {
            setPagoDe(null)
            setAviso(mensaje)
          }}
        />
      )}

      {sesionDe && (
        <SesionFormModal
          turnoId={sesionDe.turnoId}
          sesion={sesionDe.sesion}
          onCerrar={() => setSesionDe(null)}
          onListo={(mensaje) => {
            setSesionDe(null)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </div>
  )
}
