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
import type { MetodoPago, UUID } from '../../types/api'

interface Props {
  turnoId: UUID
  /** Lo que falta pagar del turno, para avisar antes de que lo rechace el backend. */
  deuda: number
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

const METODOS: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'TRUEQUE']

export function PagoFormModal({ turnoId, deuda, onCerrar, onListo }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO')
  const [monto, setMonto] = useState('')
  const [esSena, setEsSena] = useState(false)
  const [detalleTrueque, setDetalleTrueque] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const esTrueque = metodo === 'TRUEQUE'

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () =>
      registrarPago(turnoId, {
        metodo,
        monto: Number(monto),
        esSena,
        detalleTrueque: esTrueque ? detalleTrueque.trim() : undefined,
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

    const valor = Number(monto)
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorLocal('El monto tiene que ser mayor a 0.')
      return
    }
    // El backend también lo valida; acá se avisa antes de mandar el request.
    if (valor > deuda) {
      setErrorLocal(`El monto no puede superar la deuda del turno (${formatearMonto(deuda)}).`)
      return
    }
    if (esTrueque && detalleTrueque.trim() === '') {
      setErrorLocal('El detalle es obligatorio cuando el método es trueque.')
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
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
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

        <label className="flex items-center gap-2.5 text-[13.5px]">
          <input
            type="checkbox"
            checked={esSena}
            onChange={(e) => setEsSena(e.target.checked)}
            className="size-[18px] accent-sage-600"
          />
          Es una seña
        </label>

        {esTrueque && (
          <Textarea
            label="Detalle del trueque"
            required
            superficie="blanco"
            rows={3}
            value={detalleTrueque}
            onChange={(e) => setDetalleTrueque(e.target.value)}
            ayuda="Obligatorio cuando el método es trueque."
            error={campo('detalleTrueque')}
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
