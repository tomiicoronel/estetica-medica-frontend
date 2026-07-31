import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { eliminarProfesional } from '../../api/endpoints/admin'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import type { ProfesionalResponse } from '../../types/api'

interface Props {
  cuenta: ProfesionalResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

export function EliminarCuentaModal({ cuenta, onCerrar, onListo }: Props) {
  const [confirmacion, setConfirmacion] = useState('')
  const queryClient = useQueryClient()

  const nombreCompleto = `${cuenta.nombre} ${cuenta.apellido}`
  // Escribir el email es deliberadamente incómodo: el borrado es físico y no
  // hay baja lógica de cuentas a la que caerse.
  const confirmado = confirmacion.trim().toLowerCase() === cuenta.email.toLowerCase()

  const mutacion = useMutation({
    mutationFn: () => eliminarProfesional(cuenta.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'profesionales'] })
      onListo(`Cuenta de ${nombreCompleto} eliminada.`)
    },
  })

  return (
    <Modal
      titulo="Eliminar cuenta"
      subtitulo={`${nombreCompleto} — ${cuenta.email}`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variante="peligro"
            disabled={!confirmado}
            cargando={mutacion.isPending}
            onClick={() => mutacion.mutate()}
          >
            Eliminar cuenta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[14px]">
        <p className="text-[13px] leading-[1.55] text-sage-700">
          Esta acción es definitiva: no hay archivado de cuentas. La profesional pierde el acceso al
          sistema de inmediato.
        </p>

        <Input
          label={`Escribí ${cuenta.email} para confirmar`}
          superficie="blanco"
          autoComplete="off"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
        />

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
