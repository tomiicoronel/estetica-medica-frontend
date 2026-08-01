import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { cambiarPassword } from '../../api/endpoints/auth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { PasswordInput } from '../../components/ui/PasswordInput'

const MINIMO_CARACTERES = 8

interface Props {
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/**
 * Cambio de contraseña desde el perfil.
 *
 * Va en un modal y no en `/cambiar-password`: esa pantalla está detrás de
 * `RequireCambioPassword` y sólo es accesible mientras la clave inicial siga
 * sin cambiarse, así que quien ya la cambió rebotaría al inicio. El endpoint
 * es el mismo.
 */
export function CambiarPasswordModal({ onCerrar, onListo }: Props) {
  const [passwordActual, setPasswordActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const mutacion = useMutation({
    mutationFn: () => cambiarPassword({ passwordActual, passwordNueva: nueva }),
    onSuccess: () => onListo('Contraseña actualizada.'),
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    // Las mismas validaciones que en el cambio obligatorio: el backend no
    // conoce el campo "repetir" y el resto no vale un round trip.
    if (nueva.length < MINIMO_CARACTERES) {
      setErrorLocal(`La nueva contraseña debe tener al menos ${MINIMO_CARACTERES} caracteres.`)
      return
    }
    if (nueva !== repetida) {
      setErrorLocal('Las contraseñas no coinciden.')
      return
    }
    if (nueva === passwordActual) {
      setErrorLocal('La nueva contraseña tiene que ser distinta de la actual.')
      return
    }

    mutacion.mutate()
  }

  const error = mutacion.error
  const mensaje = errorLocal ?? (error ? mensajeDeError(error) : null)

  return (
    <Modal
      titulo="Cambiar contraseña"
      subtitulo="Vas a seguir con la sesión abierta."
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-password" cargando={mutacion.isPending}>
            Guardar contraseña
          </Button>
        </>
      }
    >
      <form id="form-password" onSubmit={onSubmit} className="flex flex-col gap-[14px]">
        <PasswordInput
          label="Contraseña actual"
          superficie="blanco"
          required
          autoComplete="current-password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
        />
        <PasswordInput
          label="Nueva contraseña"
          superficie="blanco"
          required
          autoComplete="new-password"
          ayuda={`Al menos ${MINIMO_CARACTERES} caracteres.`}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <PasswordInput
          label="Repetir nueva contraseña"
          superficie="blanco"
          required
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
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
