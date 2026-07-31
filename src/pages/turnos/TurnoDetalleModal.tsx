import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { cambiarEstadoTurno } from '../../api/endpoints/turnos'
import { Alert } from '../../components/ui/Alert'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatearFecha } from '../../lib/fecha'
import { ETIQUETA_ESTADO, formatearHora, formatearMonto, oGuion } from '../../lib/formato'
import type { EstadoTurno, TurnoResponse } from '../../types/api'

interface Props {
  turno: TurnoResponse
  /** Nombre del paciente; el turno sólo trae `pacienteId`. */
  nombrePaciente: string
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/** El estado actual no se ofrece: cambiarlo por sí mismo no hace nada. */
const ESTADOS: EstadoTurno[] = ['PENDIENTE', 'CONFIRMADO', 'REALIZADO', 'CANCELADO']

export function TurnoDetalleModal({ turno, nombrePaciente, onCerrar, onListo }: Props) {
  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: (nuevoEstado: EstadoTurno) => cambiarEstadoTurno(turno.id, nuevoEstado),
    onSuccess: async (_turno, nuevoEstado) => {
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onListo(`Turno marcado como ${ETIQUETA_ESTADO[nuevoEstado].toLowerCase()}.`)
    },
  })

  return (
    <Modal
      titulo="Turno"
      subtitulo={`${formatearFecha(turno.fechaHora)} · ${formatearHora(turno.fechaHora)} hs`}
      onCerrar={onCerrar}
      pie={
        <Button type="button" variante="secundario" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-[15px]">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px] font-semibold">{nombrePaciente}</span>
          <BadgeEstadoTurno estado={turno.estado} />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-sand-200 bg-sand-50 p-4">
          {turno.servicios.map((servicio) => (
            <div key={servicio.servicioId} className="flex items-center gap-2.5 text-[13.5px]">
              <span className="min-w-0 truncate">{servicio.nombre}</span>
              <span className="h-px flex-1 bg-sand-200" />
              {/* precioMomento, no el precio actual del servicio. */}
              <span className="flex-none font-semibold text-sage-800">
                {formatearMonto(servicio.precioMomento)}
              </span>
            </div>
          ))}

          <div className="mt-1 flex items-center gap-2.5 border-t border-sand-200 pt-2.5">
            <span className="text-[13px] font-medium text-sand-700">Total</span>
            <span className="ml-auto text-[17px] font-semibold text-sage-800">
              {formatearMonto(turno.montoTotal)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-[5px]">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
            Observaciones
          </span>
          <span className="whitespace-pre-wrap text-sm">{oGuion(turno.observaciones)}</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
            Cambiar estado
          </span>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.filter((estado) => estado !== turno.estado).map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => mutacion.mutate(estado)}
                disabled={mutacion.isPending}
                className="min-h-11 rounded-control border border-sand-300 bg-white px-[15px] text-[13px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-60 app:min-h-0 app:py-2"
              >
                {ETIQUETA_ESTADO[estado]}
              </button>
            ))}
          </div>
        </div>

        {mutacion.error && <Alert>{mensajeDeError(mutacion.error)}</Alert>}
      </div>
    </Modal>
  )
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
