import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { registrarPago } from '../../api/endpoints/pagos'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { ETIQUETA_METODO, formatearMonto } from '../../lib/formato'
import { esMetodoExento } from '../../lib/pagos'
import type { MetodoPago, UUID } from '../../types/api'

interface Props {
  turnoId: UUID
  /** Lo que falta pagar del turno, para avisar antes de que lo rechace el backend. */
  deuda: number
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

const METODOS: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'CANJE', 'SIN_CARGO']

export function PagoFormModal({ turnoId, deuda, onCerrar, onListo }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO')
  const [monto, setMonto] = useState('')
  const [esSena, setEsSena] = useState(false)
  const [detalleCanje, setDetalleCanje] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const esCanje = metodo === 'CANJE'
  const esExento = esMetodoExento(metodo)

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () =>
      registrarPago(turnoId, {
        metodo,
        monto: esExento ? deuda : Number(monto),
        esSena: esExento ? false : esSena,
        detalleCanje: esCanje ? detalleCanje.trim() : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pagos'] })
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onListo('Pago registrado.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    const valor = esExento ? deuda : Number(monto)
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorLocal('El monto tiene que ser mayor a 0.')
      return
    }
    // El backend también lo valida; acá se avisa antes de mandar el request.
    if (valor > deuda) {
      setErrorLocal(`El monto no puede superar la deuda del turno (${formatearMonto(deuda)}).`)
      return
    }
    if (esCanje && detalleCanje.trim() === '') {
      setErrorLocal('El detalle es obligatorio cuando el método es canje.')
      return
    }

    mutacion.mutate()
  }

  const error = mutacion.error
  const campo = (nombre: string) =>
    error instanceof ApiError ? error.campo(nombre) : undefined

  return (
    <Modal
      titulo="Registrar pago"
      subtitulo={`Podés registrar pagos parciales. Falta pagar ${formatearMonto(deuda)}.`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-pago" cargando={mutacion.isPending}>
            Registrar pago
          </Button>
        </>
      }
    >
      <form id="form-pago" onSubmit={onSubmit} className="flex flex-col gap-[15px]">
        <div className="grid gap-[13px] app:grid-cols-2 app:gap-[15px]">
          <Input
            label="Monto"
            required
            type="number"
            min="0.01"
            step="0.01"
            superficie="blanco"
            placeholder="0.00"
            value={esExento ? String(deuda) : monto}
            onChange={(e) => setMonto(e.target.value)}
            disabled={esExento}
            error={campo('monto')}
          />

          <div className="flex flex-col gap-[7px]">
            <label htmlFor="pago-metodo" className="text-[13px] font-medium text-sage-800">
              Método<span className="ml-1 text-clay-500">*</span>
            </label>
            <select
              id="pago-metodo"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoPago)}
              className="w-full rounded-control border border-sand-300 bg-white px-[13px] py-[11px] text-sm"
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {ETIQUETA_METODO[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!esExento && (
          <label className="flex items-center gap-2.5 text-[13.5px]">
            <input
              type="checkbox"
              checked={esSena}
              onChange={(e) => setEsSena(e.target.checked)}
              className="size-[18px] accent-sage-600"
            />
            Es una seña
          </label>
        )}

        {esExento && (
          <p className="text-[13px] text-sand-700">
            El turno se marca como cubierto por el total que falta ({formatearMonto(deuda)}), pero no
            cuenta como dinero cobrado. El precio del servicio se mantiene.
          </p>
        )}

        {esCanje && (
          <Textarea
            label="Detalle del canje"
            required
            superficie="blanco"
            rows={3}
            value={detalleCanje}
            onChange={(e) => setDetalleCanje(e.target.value)}
            ayuda="Obligatorio cuando el método es canje."
            error={campo('detalleCanje')}
          />
        )}

        {errorLocal && <Alert>{errorLocal}</Alert>}
        {error && <Alert>{mensajeDeError(error)}</Alert>}
      </form>
    </Modal>
  )
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
