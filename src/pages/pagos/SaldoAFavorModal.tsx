import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { devolverSaldo, trasladarSaldo } from '../../api/endpoints/pagos'
import { listarTurnosDePaciente } from '../../api/endpoints/turnos'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { formatearFecha } from '../../lib/fecha'
import { formatearHora, formatearMonto } from '../../lib/formato'
import type { TurnoResponse } from '../../types/api'

export type AccionSaldo = 'devolver' | 'trasladar'

interface Props {
  turno: TurnoResponse
  /** Saldo a favor actual del turno: monto sugerido y tope. */
  saldo: number
  accion: AccionSaldo
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/**
 * Resuelve el saldo a favor de un turno: devolverlo (sale de la caja) o pasarlo
 * a otro turno de la misma paciente (movimiento interno, la caja no cambia).
 */
export function SaldoAFavorModal({ turno, saldo, accion, onCerrar, onListo }: Props) {
  const [monto, setMonto] = useState(String(saldo))
  const [turnoDestinoId, setTurnoDestinoId] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const trasladando = accion === 'trasladar'
  const queryClient = useQueryClient()

  const turnosPaciente = useQuery({
    queryKey: ['turnos', 'paciente', turno.pacienteId],
    queryFn: () => listarTurnosDePaciente(turno.pacienteId),
    enabled: trasladando,
  })

  const destinos = (turnosPaciente.data ?? [])
    .filter((t) => t.id !== turno.id && t.estado !== 'CANCELADO')
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))

  const mutacion = useMutation({
    mutationFn: () =>
      trasladando
        ? trasladarSaldo(turno.id, { turnoDestinoId, monto: Number(monto) })
        : devolverSaldo(turno.id, { monto: Number(monto) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pagos'] })
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onListo(trasladando ? 'Saldo pasado al otro turno.' : 'Devolución registrada.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    const valor = Number(monto)
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorLocal('El monto tiene que ser mayor a 0.')
      return
    }
    if (valor > saldo) {
      setErrorLocal(`El monto no puede superar el saldo a favor (${formatearMonto(saldo)}).`)
      return
    }
    if (trasladando && turnoDestinoId === '') {
      setErrorLocal('Elegí el turno que recibe el saldo.')
      return
    }

    mutacion.mutate()
  }

  const error = mutacion.error

  return (
    <Modal
      titulo={trasladando ? 'Pasar saldo a otro turno' : 'Devolver saldo'}
      subtitulo={
        trasladando
          ? `Se mueve dentro del sistema como seña del otro turno: no es un pago nuevo y la caja no cambia. Saldo a favor: ${formatearMonto(saldo)}.`
          : `Se resta de la caja del día de hoy. Saldo a favor: ${formatearMonto(saldo)}.`
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-saldo" cargando={mutacion.isPending}>
            {trasladando ? 'Pasar saldo' : 'Registrar devolución'}
          </Button>
        </>
      }
    >
      <form id="form-saldo" onSubmit={onSubmit} className="flex flex-col gap-[15px]">
        {trasladando && (
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="saldo-destino" className="text-[13px] font-medium text-sage-800">
              Turno que recibe el saldo<span className="ml-1 text-clay-500">*</span>
            </label>
            {turnosPaciente.isPending ? (
              <p className="text-[13px] text-sand-700">Cargando turnos…</p>
            ) : destinos.length === 0 ? (
              <p className="text-[13px] text-sand-700">
                La paciente no tiene otros turnos. Creá primero el turno (puede ser sin servicio) y
                después pasale el saldo.
              </p>
            ) : (
              <select
                id="saldo-destino"
                value={turnoDestinoId}
                onChange={(e) => setTurnoDestinoId(e.target.value)}
                className="w-full rounded-control border border-sand-300 bg-white px-[13px] py-[11px] text-sm"
              >
                <option value="">Elegí un turno</option>
                {destinos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatearFecha(t.fechaHora)} {formatearHora(t.fechaHora)} ·{' '}
                    {t.servicios.map((s) => s.nombre).join(' · ') || 'Sin servicios'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <Input
          label="Monto"
          required
          type="number"
          min="0.01"
          step="0.01"
          superficie="blanco"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          error={error instanceof ApiError ? error.campo('monto') : undefined}
        />

        {errorLocal && <Alert>{errorLocal}</Alert>}
        {error && (
          <Alert>
            {error instanceof ApiError
              ? error.message
              : 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'}
          </Alert>
        )}
      </form>
    </Modal>
  )
}
