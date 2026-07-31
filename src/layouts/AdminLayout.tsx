import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/** Ítems del panel. Auditoría no está: el backend no expone ningún endpoint de auditoría. */
const NAV = [{ to: '/admin/cuentas', label: 'Cuentas' }]

function iniciales(nombre?: string, apellido?: string): string {
  const letras = `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.trim()
  return letras === '' ? '—' : letras.toUpperCase()
}

/**
 * Shell del panel de administración: sidebar oscuro desde 860px, barra
 * superior con pestañas por debajo de ese ancho.
 */
export function AdminLayout() {
  const { perfil, logout } = useAuth()

  const nombreCompleto = perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Cuenta'

  return (
    <div className="flex min-h-screen flex-col bg-sand-100 app:grid app:grid-cols-[250px_1fr]">
      {/* Sidebar — desde 860px */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-[26px] overflow-auto bg-sage-800 px-4 py-[22px] text-sage-100 app:flex">
        <div className="flex items-center gap-[11px] px-2">
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-sage-200 text-sm font-bold text-sage-800">
            EJ
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight">Estética JS</span>
            <span className="text-[11.5px] text-sage-500">Panel de administración</span>
          </div>
        </div>

        <nav className="flex flex-col gap-[3px]">
          <div className="px-[10px] pb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-sage-500">
            Accesos
          </div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-control px-[10px] py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive ? 'bg-sage-200/20 text-white' : 'text-sage-100 hover:bg-sage-200/15'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-[7px] rounded-[14px] bg-sage-200/10 p-[14px]">
          <span className="text-xs font-semibold text-sage-200">Sin acceso clínico</span>
          <span className="text-xs leading-[1.5] text-sage-300">
            La administración gestiona cuentas y accesos. Las fichas de pacientes son privadas de
            cada profesional.
          </span>
        </div>

        <div className="mt-auto flex items-center gap-2.5 border-t border-sage-200/16 pt-[14px]">
          <div className="flex size-[34px] items-center justify-center rounded-full bg-sage-200 text-[13px] font-semibold text-sage-800">
            {iniciales(perfil?.nombre, perfil?.apellido)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold">{nombreCompleto}</span>
            <span className="text-[11.5px] text-sage-500">Administración</span>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="ml-auto flex size-7 items-center justify-center rounded-[9px] border border-sage-200/25 text-[13px] text-sage-200 transition-colors hover:bg-sage-200/15"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Barra superior — por debajo de 860px */}
      <div className="sticky top-0 z-30 flex items-center gap-[11px] bg-sage-800 px-4 py-3 text-sage-100 app:hidden">
        <div className="flex size-[30px] items-center justify-center rounded-[9px] bg-sage-200 text-[13px] font-bold text-sage-800">
          EJ
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold tracking-tight">Estética JS</span>
          <span className="text-[11.5px] text-sage-500">Administración</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="ml-auto rounded-[9px] border border-sage-200/25 px-3 py-1.5 text-[13px] text-sage-200"
        >
          Salir
        </button>
      </div>

      <main className="flex min-w-0 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
