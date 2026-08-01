import { Navigate, Route, Routes } from 'react-router-dom'
import {
  RedirectSiAutenticado,
  RequireAuth,
  RequireCambioPassword,
  RequireRol,
} from './auth/guards'
import { inicioSegunRol } from './auth/rutas'
import { useAuth } from './auth/useAuth'
import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'
import { CuentasPage } from './pages/admin/CuentasPage'
import { BloqueosPage } from './pages/bloqueos/BloqueosPage'
import { PerfilPage } from './pages/perfil/PerfilPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LoginPage } from './pages/login/LoginPage'
import { PacienteDetallePage } from './pages/pacientes/PacienteDetallePage'
import { PacientesPage } from './pages/pacientes/PacientesPage'
import { PagosPage } from './pages/pagos/PagosPage'
import { ServiciosPage } from './pages/servicios/ServiciosPage'
import { TurnosPage } from './pages/turnos/TurnosPage'
import { CambiarPasswordPage } from './pages/password/CambiarPasswordPage'

/** La raíz manda a cada rol a su pantalla de inicio. */
function Inicio() {
  const { session } = useAuth()
  return <Navigate to={session ? inicioSegunRol(session.rol) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />

      <Route element={<RedirectSiAutenticado />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireCambioPassword />}>
        <Route path="/cambiar-password" element={<CambiarPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        {/* Espacio de la profesional */}
        <Route element={<RequireRol rol="PROFESIONAL" />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pacientes" element={<PacientesPage />} />
            <Route path="/pacientes/:id" element={<PacienteDetallePage />} />
            <Route path="/turnos" element={<TurnosPage />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/bloqueos" element={<BloqueosPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Route>
        </Route>

        {/* Panel de administración */}
        <Route element={<RequireRol rol="ADMIN" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/cuentas" element={<CuentasPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
