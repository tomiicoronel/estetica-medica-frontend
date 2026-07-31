import { Navigate, Route, Routes } from 'react-router-dom'
import {
  RedirectSiAutenticado,
  RequireAuth,
  RequireCambioPassword,
  RequireRol,
} from './auth/guards'
import { inicioSegunRol } from './auth/rutas'
import { useAuth } from './auth/useAuth'
import { Pendiente } from './components/Pendiente'
import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'
import { CuentasPage } from './pages/admin/CuentasPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LoginPage } from './pages/login/LoginPage'
import { PacientesPage } from './pages/pacientes/PacientesPage'
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
            <Route path="/pacientes/:id" element={<Pendiente titulo="Detalle de paciente" />} />
            <Route path="/turnos" element={<Pendiente titulo="Turnos" />} />
            <Route path="/servicios" element={<Pendiente titulo="Servicios" />} />
            <Route path="/pagos" element={<Pendiente titulo="Pagos" />} />
            <Route path="/bloqueos" element={<Pendiente titulo="Bloqueos de agenda" />} />
            <Route path="/perfil" element={<Pendiente titulo="Perfil" />} />
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
