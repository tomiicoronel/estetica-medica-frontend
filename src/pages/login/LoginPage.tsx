import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { AuthLayout } from '../../layouts/AuthLayout'

/**
 * Pantalla de login.
 *
 * BASE: solo la capa visual. La llamada a POST /api/auth/login, el manejo de
 * errores y la redirección según rol / debeCambiarPassword se conectan en el
 * paso siguiente.
 */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <AuthLayout>
      <form
        className="flex w-full max-w-[380px] animate-om-fade flex-col gap-[26px]"
        onSubmit={(e) => e.preventDefault()}
      >
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit">Ingresar</Button>

        <div className="flex flex-col gap-1.5 border-t border-sand-200 pt-[18px] text-[12.5px] text-sand-700">
          <div className="font-semibold text-sage-700">Cuentas de prueba</div>
          <div>admin@estetica.local — panel de administración</div>
          <div>lucia@estetica.local — espacio de la profesional</div>
        </div>
      </form>
    </AuthLayout>
  )
}
