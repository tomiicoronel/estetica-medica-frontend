import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { getSesionDeTurno } from '../../api/endpoints/sesiones'
import { cambiarEstadoTurno, getResumenPagosTurno } from '../../api/endpoints/turnos'
import { Alert } from '../../components/ui/Alert'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatearFecha } from '../../lib/fecha'
import {
  ETIQUETA_ESTADO,
  ETIQUETA_METODO,
  formatearHora,
  formatearMonto,
  oGuion,
} from '../../lib/formato'
import type { EstadoTurno, SesionClinicaResponse, TurnoResponse } from '../../types/api'

interface Props {
  turno: TurnoResponse
  /** Nombre del paciente; el turno sólo trae `pacienteId`. */
  nombrePaciente: string
  onCerrar: () => void
  onListo: (mensaje: string) => void
  /**
   * Abre el formulario de sesión clínica. Lo maneja la pantalla y no este
   * modal para no anidar diálogos: se cierra éste y se abre aquél.
   */
  onSesion: (sesion: SesionClinicaResponse | undefined) => void
  /** Abre el formulario de pago, con lo que falta pagar del turno. */
  onPago: (deuda: number) => void
}

/**
 * A qué estado se puede pasar desde cada estado.
 *
 * Es la misma máquina que valida `TurnoService.esTransicionValida`: un turno se
 * confirma antes de realizarse, y REALIZADO y CANCELADO son finales. Ofrecer
 * los cuatro botones siempre hacía que la regla se descubriera chocándose con
 * un 400 ("Transición de estado inválida: PENDIENTE → REALIZADO").
 */
const TRANSICIONES: Record<EstadoTurno, EstadoTurno[]> = {
  PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['REALIZADO', 'CANCELADO'],
  REALIZADO: [],
  CANCELADO: [],
}

export function TurnoDetalleModal({
  turno,
  nombrePaciente,
  onCerrar,
  onListo,
  onSesion,
  onPago,
}: Props) {
  const queryClient = useQueryClient()

  const pagos = useQuery({
    queryKey: ['pagos', 'turno', turno.id, 'resumen'],
    queryFn: () => getResumenPagosTurno(turno.id),
  })

  // Sólo los turnos realizados pueden tener sesión. Un 404 acá significa "todavía
  // no tiene", que es lo normal: por eso no se reintenta.
  const realizado = turno.estado === 'REALIZADO'
  const sesion = useQuery({
    queryKey: ['sesiones', 'turno', turno.id],
    queryFn: () => getSesionDeTurno(turno.id),
    enabled: realizado,
    retry: false,
  })

  const sinSesion =
    sesion.error instanceof ApiError && sesion.error.status === 404

  const siguientes = TRANSICIONES[turno.estado]

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
            Pagos
          </span>

          {pagos.data && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
                <span className="text-sand-700">
                  Pagado{' '}
                  <span className="font-semibold text-sage-800">
                    {formatearMonto(pagos.data.montoPagado)}
                  </span>
                </span>
                <span className="text-sand-700">
                  Deuda{' '}
                  <span
                    className={`font-semibold ${
                      pagos.data.tieneDeuda ? 'text-clay-500' : 'text-sage-800'
                    }`}
                  >
                    {formatearMonto(pagos.data.deuda)}
                  </span>
                </span>
              </div>

              {pagos.data.pagos.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {pagos.data.pagos.map((pago) => (
                    <div key={pago.id} className="flex items-center gap-2.5 text-[13px]">
                      <span className="text-sand-700">{formatearFecha(pago.fecha)}</span>
                      <span className="text-sand-700">{ETIQUETA_METODO[pago.metodo]}</span>
                      {pago.esSena && (
                        <span className="rounded-full bg-sand-200 px-2 py-0.5 text-[10.5px] font-semibold text-sand-700">
                          Seña
                        </span>
                      )}
                      <span className="h-px flex-1 bg-sand-200" />
                      <span className="font-semibold text-sage-800">
                        {formatearMonto(pago.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {pagos.data.tieneDeuda && (
                <button
                  type="button"
                  onClick={() => onPago(pagos.data.deuda)}
                  className="min-h-11 self-start rounded-control border border-sand-300 bg-white px-[15px] text-[13px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 app:min-h-0 app:py-2"
                >
                  Registrar pago
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
            Sesión clínica
          </span>

          {!realizado && (
            <span className="text-[13px] text-sand-700">
              Se puede registrar cuando el turno esté marcado como realizado.
            </span>
          )}

          {realizado && sesion.data && (
            <div className="flex items-center gap-2.5">
              <span className="min-w-0 flex-1 truncate text-[13.5px]">
                Sesión {sesion.data.numeroSesion} · {sesion.data.tratamiento}
              </span>
              <button
                type="button"
                onClick={() => onSesion(sesion.data)}
                className="flex-none rounded-[9px] border border-sand-300 bg-white px-[11px] py-1.5 text-[12.5px] font-semibold text-sage-700 transition-colors hover:bg-sage-50"
              >
                Editar
              </button>
            </div>
          )}

          {realizado && sinSesion && (
            <button
              type="button"
              onClick={() => onSesion(undefined)}
              className="min-h-11 self-start rounded-control border border-sand-300 bg-white px-[15px] text-[13px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 app:min-h-0 app:py-2"
            >
              Registrar sesión
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
            Cambiar estado
          </span>

          {siguientes.length === 0 ? (
            <span className="text-[13px] text-sand-700">
              Un turno {ETIQUETA_ESTADO[turno.estado].toLowerCase()} ya no cambia de estado.
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {siguientes.map((estado) => (
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
          )}
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
