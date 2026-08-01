import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { actualizarPerfil } from '../../api/endpoints/profesionales'
import { useAuth } from '../../auth/useAuth'
import { PageHeader } from '../../components/PageHeader'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { iniciales } from '../../lib/fecha'
import { CambiarPasswordModal } from './CambiarPasswordModal'

/**
 * "Mi perfil": los datos propios de `/api/profesionales/me`.
 *
 * El perfil ya lo trae el contexto de auth (lo usa la barra lateral), así que
 * la pantalla lo lee de ahí en vez de pedirlo otra vez, y al guardar invalida
 * esa misma query para que el nombre de la barra se actualice solo.
 */
export function PerfilPage() {
  const { session, perfil } = useAuth()

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [especialidad, setEspecialidad] = useState('')

  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  // El perfil llega asincrónico: los campos se llenan cuando aparece.
  useEffect(() => {
    if (perfil === undefined) return
    setNombre(perfil.nombre)
    setApellido(perfil.apellido)
    setEmail(perfil.email)
    setTelefono(perfil.telefono)
    setEspecialidad(perfil.especialidad ?? '')
  }, [perfil])

  const queryClient = useQueryClient()

  const guardar = useMutation({
    mutationFn: () =>
      actualizarPerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        especialidad: especialidad.trim() === '' ? undefined : especialidad.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['perfil'] })
      setAviso('Perfil actualizado.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    guardar.mutate()
  }

  const error = guardar.error
  const campo = (nombreCampo: string) =>
    error instanceof ApiError ? error.campo(nombreCampo) : undefined

  return (
    <>
      <PageHeader titulo="Mi perfil" subtitulo="Tus datos dentro del sistema." />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:px-[34px] app:pb-15 app:pt-7">
        {perfil === undefined && <Skeleton filas={3} />}

        {perfil !== undefined && (
          <form
            onSubmit={onSubmit}
            className="flex w-full max-w-[720px] flex-col gap-[22px] rounded-2xl border border-sand-200 bg-sand-50 p-[26px]"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-14.5 flex-none items-center justify-center rounded-full bg-sage-200 text-[19px] font-semibold text-sage-800">
                {iniciales(perfil.nombre, perfil.apellido)}
              </div>
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className="text-[18px] font-semibold tracking-[-0.02em]">
                  {perfil.nombre} {perfil.apellido}
                </span>
                <span className="truncate text-[13px] text-sand-700">{perfil.email}</span>
              </div>
            </div>

            <div className="grid gap-4 app:grid-cols-2">
              <Input
                label="Nombre"
                superficie="blanco"
                required
                maxLength={100}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={campo('nombre')}
              />
              <Input
                label="Apellido"
                superficie="blanco"
                required
                maxLength={100}
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                error={campo('apellido')}
              />
              <Input
                label="Email"
                superficie="blanco"
                type="email"
                required
                maxLength={150}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={campo('email')}
                ayuda="Es también tu usuario para entrar."
              />
              <Input
                label="Teléfono"
                superficie="blanco"
                required
                maxLength={20}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                error={campo('telefono')}
              />
              <Input
                label="Especialidad"
                superficie="blanco"
                maxLength={100}
                placeholder="Opcional"
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                error={campo('especialidad')}
              />
            </div>

            {error && <Alert>{mensajeDeError(error)}</Alert>}

            <div className="flex flex-col gap-2.5 border-t border-sand-200 pt-4 app:flex-row">
              <Button type="submit" cargando={guardar.isPending}>
                Guardar cambios
              </Button>
              <Button
                type="button"
                variante="secundario"
                onClick={() => setCambiandoPassword(true)}
              >
                Cambiar contraseña
              </Button>
            </div>
          </form>
        )}

        {session !== null && (
          <p className="text-[12.5px] text-sand-700">
            Sesión iniciada como {session.rol === 'ADMIN' ? 'administración' : 'profesional'}.
          </p>
        )}
      </div>

      {cambiandoPassword && (
        <CambiarPasswordModal
          onCerrar={() => setCambiandoPassword(false)}
          onListo={(mensaje) => {
            setCambiandoPassword(false)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </>
  )
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
