import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { actualizarBloqueo, crearBloqueo } from '../../api/endpoints/bloqueos'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CampoFecha } from '../../components/ui/CampoFecha'
import { CampoHora } from '../../components/ui/CampoHora'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { esHoraValida } from '../../lib/fecha'
import type { BloqueoAgendaResponse } from '../../types/api'

interface Props {
  bloqueo?: BloqueoAgendaResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

export function BloqueoFormModal({ bloqueo, onCerrar, onListo }: Props) {
  const [fechaInicio, setFechaInicio] = useState(parteFecha(bloqueo?.fechaInicio))
  const [horaInicio, setHoraInicio] = useState(parteHora(bloqueo?.fechaInicio))
  const [fechaFin, setFechaFin] = useState(parteFecha(bloqueo?.fechaFin))
  const [horaFin, setHoraFin] = useState(parteHora(bloqueo?.fechaFin))
  const [motivo, setMotivo] = useState(bloqueo?.motivo ?? '')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () => {
      // El backend espera LocalDateTime sin zona: se arma pegando fecha y hora.
      const body = {
        fechaInicio: `${fechaInicio}T${horaInicio}:00`,
        fechaFin: `${fechaFin}T${horaFin}:00`,
        motivo: motivo.trim() === '' ? undefined : motivo.trim(),
      }
      return bloqueo === undefined ? crearBloqueo(body) : actualizarBloqueo(bloqueo.id, body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bloqueos'] })
      onListo(bloqueo === undefined ? 'Agenda bloqueada.' : 'Bloqueo actualizado.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    if (fechaInicio === '' || fechaFin === '') {
      setErrorLocal('Completá la fecha de inicio y la de fin.')
      return
    }
    if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
      setErrorLocal('Las horas tienen que estar en formato hh:mm, por ejemplo 14:30.')
      return
    }
    // Vale la pena atajarlo acá: el backend rechaza el rango invertido, pero
    // con un mensaje mucho menos claro que este.
    if (`${fechaFin}T${horaFin}` <= `${fechaInicio}T${horaInicio}`) {
      setErrorLocal('El fin del bloqueo tiene que ser posterior al inicio.')
      return
    }

    mutacion.mutate()
  }

  const error = mutacion.error
  const campo = (nombre: string) => (error instanceof ApiError ? error.campo(nombre) : undefined)

  /** Al elegir el inicio, el fin arranca el mismo día: casi siempre es así. */
  function elegirFechaInicio(valor: string) {
    setFechaInicio(valor)
    if (fechaFin === '') setFechaFin(valor)
  }

  return (
    <Modal
      titulo={bloqueo === undefined ? 'Bloquear agenda' : 'Editar bloqueo'}
      subtitulo="No vas a poder agendar turnos dentro de este rango."
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-bloqueo" cargando={mutacion.isPending}>
            {bloqueo === undefined ? 'Bloquear' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <form id="form-bloqueo" onSubmit={onSubmit} className="flex flex-col gap-[15px]">
        <div className="grid gap-[15px] app:grid-cols-2">
          <CampoFecha
            label="Desde"
            superficie="blanco"
            required
            value={fechaInicio}
            onChange={elegirFechaInicio}
            error={campo('fechaInicio')}
          />
          <CampoHora
            label="Hora de inicio"
            superficie="blanco"
            required
            value={horaInicio}
            onChange={setHoraInicio}
          />
          <CampoFecha
            label="Hasta"
            superficie="blanco"
            required
            value={fechaFin}
            onChange={setFechaFin}
            error={campo('fechaFin')}
          />
          <CampoHora
            label="Hora de fin"
            superficie="blanco"
            required
            value={horaFin}
            onChange={setHoraFin}
          />
        </div>

        <Input
          label="Motivo"
          superficie="blanco"
          placeholder="Vacaciones, congreso, feriado…"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          error={campo('motivo')}
          ayuda="Opcional. Hasta 200 caracteres."
        />

        {errorLocal && <Alert>{errorLocal}</Alert>}
        {error && <Alert>{mensajeDeError(error)}</Alert>}
      </form>
    </Modal>
  )
}

function parteFecha(iso?: string): string {
  return iso === undefined ? '' : iso.slice(0, 10)
}

function parteHora(iso?: string): string {
  return iso === undefined ? '' : iso.slice(11, 16)
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
