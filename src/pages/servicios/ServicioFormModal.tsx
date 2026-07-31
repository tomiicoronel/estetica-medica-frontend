import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { actualizarServicio, crearServicio } from '../../api/endpoints/servicios'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import type { ServicioResponse } from '../../types/api'

interface Props {
  /** Undefined = alta; definido = edición de ese servicio. */
  servicio?: ServicioResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/**
 * Alta y edición de servicios.
 *
 * El precio se edita acá y no con `PATCH /api/servicios/{id}/precio`: ese
 * endpoint sólo cambia el precio y obligaría a un segundo request para el resto.
 * `PUT` cubre los tres campos y deja igual los turnos ya agendados, que guardan
 * su propio `precioMomento`.
 */
export function ServicioFormModal({ servicio, onCerrar, onListo }: Props) {
  const esEdicion = servicio !== undefined

  const [nombre, setNombre] = useState(servicio?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? '')
  const [precio, setPrecio] = useState(servicio ? String(servicio.precio) : '')

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () => {
      const datos = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio: Number(precio),
      }

      return esEdicion ? actualizarServicio(servicio.id, datos) : crearServicio(datos)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servicios'] })
      onListo(esEdicion ? 'Servicio actualizado.' : 'Servicio creado.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    mutacion.mutate()
  }

  const error = mutacion.error
  const campo = (nombreCampo: string) =>
    error instanceof ApiError ? error.campo(nombreCampo) : undefined

  return (
    <Modal
      titulo={esEdicion ? 'Editar servicio' : 'Nuevo servicio'}
      subtitulo={
        esEdicion
          ? 'Los turnos ya agendados conservan el precio con el que se sacaron; el nuevo valor se aplica sólo a los que agendes de ahora en más.'
          : 'Los servicios desactivados se conservan en el historial de turnos.'
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-servicio" cargando={mutacion.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Guardar servicio'}
          </Button>
        </>
      }
    >
      <form id="form-servicio" onSubmit={onSubmit} className="grid gap-[13px] app:gap-[15px]">
        <Input
          label="Nombre"
          required
          superficie="blanco"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          // El backend rechaza dos servicios con el mismo nombre para la misma cuenta.
          ayuda="No puede repetirse con otro servicio tuyo."
          error={campo('nombre')}
        />
        <Input
          label="Descripción"
          // La guía la lista opcional, pero ServicioRequest la valida @NotBlank.
          required
          superficie="blanco"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          error={campo('descripcion')}
        />
        <Input
          label="Precio"
          required
          type="number"
          min="0.01"
          step="0.01"
          superficie="blanco"
          placeholder="0.00"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          error={campo('precio')}
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
