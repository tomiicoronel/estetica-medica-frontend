import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { resetearPassword } from '../../api/endpoints/admin'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { PasswordInput } from '../../components/ui/PasswordInput'
import type { ProfesionalResponse } from '../../types/api'

const MINIMO_CARACTERES = 8

interface Props {
  cuenta: ProfesionalResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

export function ResetearClaveModal({ cuenta, onCerrar, onListo }: Props) {
  const [nueva, setNueva] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const mutacion = useMutation({
    mutationFn: () => resetearPassword(cuenta.id, { passwordNueva: nueva }),
    // No invalida el listado: ProfesionalResponse no expone nada que cambie.
    onSuccess: () => onListo(`Contraseña de ${cuenta.nombre} reseteada.`),
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    if (nueva.length < MINIMO_CARACTERES) {
      setErrorLocal(`La contraseña debe tener al menos ${MINIMO_CARACTERES} caracteres.`)
      return
    }

    mutacion.mutate()
  }

  const error = mutacion.error
  const mensaje = errorLocal ?? (error ? mensajeDeError(error) : null)

  return (
    <Modal
      titulo="Resetear contraseña"
      subtitulo={`${cuenta.nombre} ${cuenta.apellido} — ${cuenta.email}`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-clave" cargando={mutacion.isPending}>
            Resetear contraseña
          </Button>
        </>
      }
    >
      <form id="form-clave" onSubmit={onSubmit} className="flex flex-col gap-[14px]">
        <p className="text-[13px] leading-[1.55] text-sage-700">
          La cuenta va a quedar marcada para cambiar la contraseña en su próximo ingreso. Pasale
          esta contraseña temporal por un canal seguro.
        </p>

        <PasswordInput
          label="Contraseña temporal"
          required
          superficie="blanco"
          autoComplete="new-password"
          ayuda={`Mínimo ${MINIMO_CARACTERES} caracteres.`}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          error={error instanceof ApiError ? error.campo('passwordNueva') : undefined}
        />

        {mensaje && <Alert>{mensaje}</Alert>}
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
