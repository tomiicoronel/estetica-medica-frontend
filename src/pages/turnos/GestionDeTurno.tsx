import { useState } from 'react'
import type { SesionClinicaResponse, TurnoResponse, UUID } from '../../types/api'
import { PagoFormModal } from '../pagos/PagoFormModal'
import { SaldoAFavorModal, type AccionSaldo } from '../pagos/SaldoAFavorModal'
import { SesionFormModal } from '../sesiones/SesionFormModal'
import { TurnoDetalleModal } from './TurnoDetalleModal'
import { TurnoFormModal } from './TurnoFormModal'

interface Props {
  /**
   * The appointment whose detail is open, or null. The screen looks it up by id
   * in its own query so that, after a state change, the detail shows the
   * refreshed appointment and not the one that was clicked.
   */
  turno: TurnoResponse | null
  nombrePaciente: string
  /** Close the detail. Also called when the detail hands over to another form. */
  onCerrarDetalle: () => void
  /** Feedback message for the screen's toast. */
  onAviso: (mensaje: string) => void
}

/**
 * Everything you can do with an appointment: its detail and the forms it opens
 * (edit, payment, credit balance, clinical session). Each form replaces the
 * detail instead of stacking on it, and keeps its own data, so it stays open
 * after the detail closes. Shared by Turnos, the patient's Turnos tab and the
 * dashboard so the three behave the same.
 */
export function GestionDeTurno({ turno, nombrePaciente, onCerrarDetalle, onAviso }: Props) {
  const [editando, setEditando] = useState<TurnoResponse | null>(null)
  const [pagoDe, setPagoDe] = useState<{
    turnoId: UUID
    deuda: number
    sinServicios: boolean
  } | null>(null)
  const [saldoDe, setSaldoDe] = useState<{
    turno: TurnoResponse
    saldo: number
    accion: AccionSaldo
  } | null>(null)
  const [sesionDe, setSesionDe] = useState<{
    turnoId: UUID
    sesion: SesionClinicaResponse | undefined
  } | null>(null)

  return (
    <>
      {turno && (
        <TurnoDetalleModal
          turno={turno}
          nombrePaciente={nombrePaciente}
          onCerrar={onCerrarDetalle}
          onListo={onAviso}
          onSesion={(sesion) => {
            setSesionDe({ turnoId: turno.id, sesion })
            onCerrarDetalle()
          }}
          onPago={(deuda, sinServicios) => {
            setPagoDe({ turnoId: turno.id, deuda, sinServicios })
            onCerrarDetalle()
          }}
          onSaldo={(accion, saldo) => {
            setSaldoDe({ turno, saldo, accion })
            onCerrarDetalle()
          }}
          onEditar={(aEditar) => {
            setEditando(aEditar)
            onCerrarDetalle()
          }}
          onEliminado={(mensaje) => {
            onCerrarDetalle()
            onAviso(mensaje)
          }}
        />
      )}

      {editando && (
        <TurnoFormModal
          turno={editando}
          onCerrar={() => setEditando(null)}
          onListo={(mensaje) => {
            setEditando(null)
            onAviso(mensaje)
          }}
        />
      )}

      {pagoDe && (
        <PagoFormModal
          turnoId={pagoDe.turnoId}
          deuda={pagoDe.deuda}
          sinServicios={pagoDe.sinServicios}
          onCerrar={() => setPagoDe(null)}
          onListo={(mensaje) => {
            setPagoDe(null)
            onAviso(mensaje)
          }}
        />
      )}

      {saldoDe && (
        <SaldoAFavorModal
          turno={saldoDe.turno}
          saldo={saldoDe.saldo}
          accion={saldoDe.accion}
          onCerrar={() => setSaldoDe(null)}
          onListo={(mensaje) => {
            setSaldoDe(null)
            onAviso(mensaje)
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
            onAviso(mensaje)
          }}
        />
      )}
    </>
  )
}
