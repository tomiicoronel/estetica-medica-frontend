import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Modal } from '../components/ui/Modal'
import { iniciales } from '../lib/fecha'

/** Grupos del sidebar, tal cual el diseño. */
const GRUPOS = [
  {
    titulo: 'Trabajo diario',
    items: [
      { to: '/dashboard', label: 'Inicio' },
      { to: '/turnos', label: 'Turnos' },
      { to: '/pacientes', label: 'Pacientes' },
      { to: '/bloqueos', label: 'Bloqueos de agenda' },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { to: '/servicios', label: 'Servicios' },
      { to: '/pagos', label: 'Pagos y deuda' },
    ],
  },
  { titulo: 'Cuenta', items: [{ to: '/perfil', label: 'Mi perfil' }] },
]

/** Barra inferior de mobile: los accesos directos del día a día. */
const NAV_MOBILE = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/turnos', label: 'Turnos' },
  { to: '/pacientes', label: 'Pacientes' },
]

/** El resto del menú, detrás del botón "Más" de la barra inferior. */
const NAV_MOBILE_MAS = [
  { to: '/bloqueos', label: 'Bloqueos de agenda' },
  { to: '/pagos', label: 'Pagos y deuda' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/perfil', label: 'Mi perfil' },
]

/** Tres puntos verticales del botón "Más" de la barra inferior. */
function IconoMas() {
  return (
    <svg className="size-[15px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

/** Shell del espacio de la profesional: sidebar claro desde 860px. */
export function AppLayout() {
  const { perfil, logout } = useAuth()
  const [masAbierto, setMasAbierto] = useState(false)
  const { pathname } = useLocation()

  const nombreCompleto = perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Mi cuenta'

  // El botón "Más" se marca activo cuando estás parada en una de sus pantallas.
  const masActivo = NAV_MOBILE_MAS.some((item) => pathname.startsWith(item.to))

  return (
    <div className="flex min-h-screen flex-col bg-sand-100 app:grid app:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-[26px] overflow-auto border-r border-sand-200 bg-sand-50 px-4 py-[22px] app:flex">
        <div className="flex items-center gap-[11px] px-2">
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-sage-600 text-sm font-bold text-white">
            EJ
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight">Estética JS</span>
            <span className="text-[11.5px] text-sage-500">Gestión de consultorio</span>
          </div>
        </div>

        <nav className="flex flex-col gap-5">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="flex flex-col gap-[3px]">
              <div className="px-[10px] pb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-sand-500">
                {grupo.titulo}
              </div>
              {grupo.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-control px-[10px] py-2.5 text-[13.5px] transition-colors ${
                      isActive
                        ? 'bg-sage-200 font-semibold text-sage-900'
                        : 'font-medium text-sage-800 hover:bg-sage-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden
                        className={`size-[7px] flex-none rounded-full ${
                          isActive ? 'bg-sage-600' : 'bg-sand-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 border-t border-sand-200 pt-[14px]">
          <div className="flex size-[34px] items-center justify-center rounded-full bg-sage-200 text-[13px] font-semibold text-sage-800">
            {perfil ? iniciales(perfil.nombre, perfil.apellido) : '—'}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold">{nombreCompleto}</span>
            <span className="text-[11.5px] text-sage-500">Profesional</span>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="ml-auto flex size-7 items-center justify-center rounded-[9px] border border-sand-200 text-[13px] text-sand-700 transition-colors hover:bg-sand-100"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Barra superior — por debajo de 860px */}
      <div className="sticky top-0 z-30 flex items-center gap-[11px] border-b border-sand-200 bg-sand-50 px-4 py-3 app:hidden">
        <div className="flex size-[30px] items-center justify-center rounded-[9px] bg-sage-600 text-[13px] font-bold text-white">
          EJ
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold tracking-tight">Estética JS</span>
          <span className="text-[11.5px] text-sage-500">{nombreCompleto}</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="ml-auto rounded-[9px] border border-sand-200 px-3 py-1.5 text-[13px] text-sand-700"
        >
          Salir
        </button>
      </div>

      <main className="flex min-w-0 flex-col">
        <Outlet />
      </main>

      {/* Bottom nav — por debajo de 860px. El padding inferior del contenido
          de cada pantalla (pb-25) reserva el espacio para no tapar nada. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sand-200 bg-sand-50 app:hidden">
        {NAV_MOBILE.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11.5px] ${
                isActive ? 'font-semibold text-sage-700' : 'text-sand-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`size-[7px] rounded-full ${isActive ? 'bg-sage-600' : 'bg-sand-400'}`}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Las pantallas que no entran en la barra viven detrás de este botón. */}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          aria-haspopup="dialog"
          aria-expanded={masAbierto}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11.5px] ${
            masActivo ? 'font-semibold text-sage-700' : 'text-sand-700'
          }`}
        >
          <IconoMas />
          <span>Más</span>
        </button>
      </nav>

      {masAbierto && (
        <Modal titulo="Más opciones" onCerrar={() => setMasAbierto(false)}>
          <nav className="flex flex-col gap-[3px]">
            {NAV_MOBILE_MAS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMasAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-control px-[10px] py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-sage-200 font-semibold text-sage-900'
                      : 'font-medium text-sage-800 hover:bg-sage-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden
                      className={`size-[7px] flex-none rounded-full ${
                        isActive ? 'bg-sage-600' : 'bg-sand-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </Modal>
      )}
    </div>
  )
}
