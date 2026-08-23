import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { inicioSegunRol } from '../../auth/rutas'
import { useAuth } from '../../auth/useAuth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { AuthLayout } from '../../layouts/AuthLayout'

/** Ruta a la que iba el usuario antes de que el guard lo mandara a /login. */
interface LoginLocationState {
  from?: string
}

/**
 * Las cuentas de prueba son una comodidad del desarrollo local. Vite fija DEV
 * en false en cualquier build, así que el bloque no llega a producción: los
 * emails ni siquiera quedan en el bundle.
 */
const MOSTRAR_CUENTAS_PRUEBA = import.meta.env.DEV

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const mutacion = useMutation({
    mutationFn: () => login({ email: email.trim(), password }),
    onSuccess: (respuesta) => {
      // El backend bloquea todo lo demás mientras la contraseña sea la inicial,
      // así que este chequeo va primero.
      if (respuesta.debeCambiarPassword) {
        navigate('/cambiar-password', { replace: true })
        return
      }

      const destinoPrevio = (location.state as LoginLocationState | null)?.from
      navigate(destinoPrevio ?? inicioSegunRol(respuesta.rol), { replace: true })
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    mutacion.mutate()
  }

  const error = mutacion.error

  return (
    <AuthLayout>
      <form className="flex w-full max-w-[380px] animate-om-fade flex-col gap-[26px]" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">Iniciar sesión</h2>
          <p className="text-sm text-sage-700">Ingresá con la cuenta que te asignaron.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // En un 400 de validación el backend indica el campo; lo mostramos ahí.
            error={error instanceof ApiError ? error.campo('email') : undefined}
          />
          <PasswordInput
            label="Contraseña"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error instanceof ApiError ? error.campo('password') : undefined}
          />
        </div>

        {error && <Alert>{mensajeDeError(error)}</Alert>}

        <Button type="submit" cargando={mutacion.isPending}>
          {mutacion.isPending ? 'Ingresando…' : 'Ingresar'}
        </Button>

        {MOSTRAR_CUENTAS_PRUEBA && (
          <div className="flex flex-col gap-1.5 border-t border-sand-200 pt-[18px] text-[12.5px] text-sand-700">
            <div className="font-semibold text-sage-700">Cuentas de prueba</div>
            <div>admin@estetica.local — panel de administración</div>
            <div>lucia@estetica.local — espacio de la profesional</div>
          </div>
        )}
      </form>
    </AuthLayout>
  )
}

/**
 * El 401 del login significa "credenciales incorrectas", no "sesión vencida":
 * acá todavía no había sesión. El resto de los mensajes ya vienen redactados
 * del backend.
 */
function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }

  if (error.status === 401) return 'Email o contraseña incorrectos.'
  return error.message
}
