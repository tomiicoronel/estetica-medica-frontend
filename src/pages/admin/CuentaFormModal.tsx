import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { crearProfesional, editarProfesional } from '../../api/endpoints/admin'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PasswordInput } from '../../components/ui/PasswordInput'
import type { ProfesionalResponse } from '../../types/api'

interface Props {
  /** Undefined = alta; definida = edición de esa cuenta. */
  cuenta?: ProfesionalResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/**
 * Alta y edición de cuentas comparten formulario porque comparten campos: la
 * única diferencia es la contraseña inicial, que solo existe en el alta
 * (EditarProfesionalRequest no toca password, rol ni debeCambiarPassword).
 */
export function CuentaFormModal({ cuenta, onCerrar, onListo }: Props) {
  const esEdicion = cuenta !== undefined

  const [nombre, setNombre] = useState(cuenta?.nombre ?? '')
  const [apellido, setApellido] = useState(cuenta?.apellido ?? '')
  const [email, setEmail] = useState(cuenta?.email ?? '')
  const [telefono, setTelefono] = useState(cuenta?.telefono ?? '')
  const [especialidad, setEspecialidad] = useState(cuenta?.especialidad ?? '')
  const [password, setPassword] = useState('')

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () => {
      const datos = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        // El campo es opcional: mandar "" en vez de omitirlo guardaría vacío.
        especialidad: especialidad.trim() === '' ? undefined : especialidad.trim(),
      }

      return esEdicion
        ? editarProfesional(cuenta.id, datos)
        : crearProfesional({ ...datos, password })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'profesionales'] })
      onListo(
        esEdicion
          ? 'Cuenta actualizada.'
          : 'Cuenta creada. Va a tener que cambiar la contraseña en su primer ingreso.',
      )
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
      titulo={esEdicion ? 'Editar cuenta' : 'Nueva cuenta'}
      subtitulo={
        esEdicion
          ? 'Cambiar estos datos no modifica la contraseña ni el rol.'
          : 'La cuenta se crea con rol profesional y contraseña temporal.'
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cuenta" cargando={mutacion.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </>
      }
    >
      <form id="form-cuenta" onSubmit={onSubmit} className="grid gap-[13px] app:grid-cols-2 app:gap-[15px]">
        <Input
          label="Nombre"
          required
          superficie="blanco"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={campo('nombre')}
        />
        <Input
          label="Apellido"
          required
          superficie="blanco"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          error={campo('apellido')}
        />
        <Input
          label="Email"
          type="email"
          required
          superficie="blanco"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={campo('email')}
        />
        <Input
          label="Teléfono"
          required
          superficie="blanco"
          // El backend rechaza texto libre con 400: solo números y signos.
          inputMode="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={campo('telefono')}
        />
        <Input
          label="Especialidad"
          superficie="blanco"
          placeholder="Opcional"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
          error={campo('especialidad')}
        />
        {!esEdicion && (
          <PasswordInput
            label="Contraseña temporal"
            required
            superficie="blanco"
            autoComplete="new-password"
            ayuda="Mínimo 8 caracteres. Se la vas a tener que pasar a la profesional."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={campo('password')}
          />
        )}

        {error && (
          <div className="app:col-span-2">
            <Alert>{mensajeDeError(error)}</Alert>
          </div>
        )}
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
