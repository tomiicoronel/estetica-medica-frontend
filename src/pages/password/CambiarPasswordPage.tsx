import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { cambiarPassword } from '../../api/endpoints/auth'
import { inicioSegunRol } from '../../auth/rutas'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'

const MINIMO_CARACTERES = 8

export function CambiarPasswordPage() {
  const [passwordActual, setPasswordActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const { session, confirmarCambioPassword } = useAuth()
  const navigate = useNavigate()

  const mutacion = useMutation({
    mutationFn: () => cambiarPassword({ passwordActual, passwordNueva: nueva }),
    onSuccess: () => {
      // El backend consulta la base en cada request, así que el token actual
      // queda habilitado apenas se guarda el cambio: no hace falta re-loguear.
      confirmarCambioPassword()
      navigate(inicioSegunRol(session?.rol ?? 'PROFESIONAL'), { replace: true })
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    // Validaciones que el backend no puede hacer (no conoce el campo "repetir")
    // o que no vale la pena pagar con un round trip.
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
    <div className="flex min-h-screen items-center justify-center bg-sand-100 p-10">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-[460px] animate-om-fade flex-col gap-[22px] rounded-[20px] border border-sand-200 bg-sand-50 p-[34px]"
      >
        <div className="flex flex-col gap-2">
          {/* Ámbar del diseño para el aviso; no es un color de marca. */}
          <div className="self-start rounded-full bg-[#fdf1d6] px-[11px] py-[5px] text-xs font-semibold text-[#8a6410]">
            Paso obligatorio
          </div>
          <h2 className="text-[23px] font-semibold tracking-[-0.02em]">
            Cambiá tu contraseña inicial
          </h2>
          <p className="text-pretty text-sm leading-[1.55] text-sage-700">
            Tu cuenta fue creada por administración con una contraseña temporal. Elegí una propia
            para poder usar el sistema.
          </p>
        </div>

        <div className="flex flex-col gap-[14px]">
          <PasswordInput
            label="Contraseña actual"
            autoComplete="current-password"
            superficie="blanco"
            required
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            error={error instanceof ApiError ? error.campo('passwordActual') : undefined}
          />
          <PasswordInput
            label="Nueva contraseña"
            autoComplete="new-password"
            superficie="blanco"
            required
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            error={error instanceof ApiError ? error.campo('passwordNueva') : undefined}
          />
          <PasswordInput
            label="Repetir contraseña"
            autoComplete="new-password"
            superficie="blanco"
            required
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
          />
          <div className="text-[12.5px] text-sand-700">Mínimo {MINIMO_CARACTERES} caracteres.</div>
        </div>

        {mensaje && <Alert>{mensaje}</Alert>}

        <Button type="submit" cargando={mutacion.isPending}>
          {mutacion.isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </div>
  )
}

/**
 * Acá el 401 es "la contraseña actual no coincide" (AuthController lo documenta
 * así); el cliente HTTP ya sabe que no debe cerrar sesión por eso.
 */
function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }

  if (error.status === 401) return 'La contraseña actual no es correcta.'
  return error.message
}
