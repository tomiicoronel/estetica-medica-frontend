import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { actualizarSesion, crearSesion } from '../../api/endpoints/sesiones'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import type { SesionClinicaResponse, UUID } from '../../types/api'

interface Props {
  /** Turno al que pertenece la sesión. Sólo hace falta para el alta. */
  turnoId: UUID
  /** Undefined = alta; definida = edición de esa sesión. */
  sesion?: SesionClinicaResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/**
 * Alta y edición de la sesión clínica de un turno.
 *
 * El número de sesión no se pide: lo calcula el backend contando las sesiones
 * previas del paciente. El alta sólo funciona con turnos REALIZADO y falla con
 * 400 si el turno ya tiene una.
 */
export function SesionFormModal({ turnoId, sesion, onCerrar, onListo }: Props) {
  const esEdicion = sesion !== undefined

  const [tratamiento, setTratamiento] = useState(sesion?.tratamiento ?? '')
  const [respuesta, setRespuesta] = useState(sesion?.respuestaTolerancia ?? '')
  const [observaciones, setObservaciones] = useState(sesion?.observaciones ?? '')

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () => {
      const datos = {
        tratamiento: tratamiento.trim(),
        respuestaTolerancia: respuesta.trim(),
        observaciones: observaciones.trim() === '' ? undefined : observaciones.trim(),
      }

      return esEdicion ? actualizarSesion(sesion.id, datos) : crearSesion(turnoId, datos)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sesiones'] })
      onListo(esEdicion ? 'Sesión actualizada.' : 'Sesión clínica registrada.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    mutacion.mutate()
  }

  const error = mutacion.error
  const campo = (nombre: string) =>
    error instanceof ApiError ? error.campo(nombre) : undefined

  return (
    <Modal
      titulo={esEdicion ? `Sesión ${sesion.numeroSesion}` : 'Registrar sesión clínica'}
      subtitulo={
        esEdicion
          ? 'Corregí lo que haga falta de esta sesión.'
          : 'El número de sesión se calcula automáticamente.'
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-sesion" cargando={mutacion.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Guardar sesión'}
          </Button>
        </>
      }
    >
      <form id="form-sesion" onSubmit={onSubmit} className="flex flex-col gap-[15px]">
        <Textarea
          label="Tratamiento realizado"
          required
          superficie="blanco"
          rows={3}
          maxLength={5000}
          value={tratamiento}
          onChange={(e) => setTratamiento(e.target.value)}
          error={campo('tratamiento')}
        />
        <Textarea
          label="Respuesta y tolerancia"
          // La guía la lista opcional, pero el backend la valida @NotBlank.
          required
          superficie="blanco"
          rows={3}
          maxLength={5000}
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          error={campo('respuestaTolerancia')}
        />
        <Textarea
          label="Observaciones"
          superficie="blanco"
          rows={3}
          maxLength={5000}
          placeholder="Opcional"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          error={campo('observaciones')}
        />

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
