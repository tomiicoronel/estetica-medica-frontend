import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarSesionesDePaciente } from '../../api/endpoints/sesiones'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha } from '../../lib/fecha'
import { oGuion } from '../../lib/formato'
import type { SesionClinicaResponse, UUID } from '../../types/api'
import { SesionFormModal } from '../sesiones/SesionFormModal'

/**
 * Pestaña "Sesiones" de la ficha.
 *
 * Acá sólo se leen y corrigen: una sesión nueva se registra desde su turno,
 * porque el backend la cuelga de un turno REALIZADO y no de un paciente suelto.
 */
export function SesionesDelPaciente({ pacienteId }: { pacienteId: UUID }) {
  const [editando, setEditando] = useState<SesionClinicaResponse | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const { data: sesiones, isPending, error } = useQuery({
    queryKey: ['sesiones', 'paciente', pacienteId],
    queryFn: () => listarSesionesDePaciente(pacienteId),
  })

  return (
    <div className="flex flex-col gap-[14px]">
      {isPending && <Skeleton filas={3} />}
      {error && <ErrorDeCarga error={error} />}

      {sesiones?.map((sesion) => (
        <div
          key={sesion.id}
          className="flex gap-5 rounded-2xl border border-sand-200 bg-sand-50 p-[22px]"
        >
          <div className="flex flex-none flex-col items-center gap-2">
            <div className="flex size-[42px] items-center justify-center rounded-full bg-sage-100 text-sm font-semibold text-sage-800">
              {sesion.numeroSesion}
            </div>
            <div className="whitespace-nowrap text-[11.5px] text-sage-500">
              {formatearFecha(sesion.creadoEn)}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 text-[14.5px] font-semibold text-sage-800">
                {sesion.tratamiento}
              </div>
              <button
                type="button"
                onClick={() => setEditando(sesion)}
                className="flex-none rounded-[9px] border border-sand-300 bg-white px-[11px] py-1.5 text-[12.5px] font-semibold text-sage-700 transition-colors hover:bg-sage-50"
              >
                Editar
              </button>
            </div>

            <div className="grid gap-4 app:grid-cols-2">
              <Campo label="Respuesta y tolerancia" valor={oGuion(sesion.respuestaTolerancia)} />
              <Campo label="Observaciones" valor={oGuion(sesion.observaciones)} />
            </div>
          </div>
        </div>
      ))}

      {sesiones && sesiones.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-13 text-center">
          <div className="text-sm font-medium">Todavía no hay sesiones clínicas registradas</div>
          <div className="text-[13px] text-sand-700">
            Se registran desde el turno, una vez que lo marcás como realizado.
          </div>
        </div>
      )}

      {editando && (
        <SesionFormModal
          turnoId={editando.turnoId}
          sesion={editando}
          onCerrar={() => setEditando(null)}
          onListo={(mensaje) => {
            setEditando(null)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
        {label}
      </span>
      <span className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.55]">{valor}</span>
    </div>
  )
}
