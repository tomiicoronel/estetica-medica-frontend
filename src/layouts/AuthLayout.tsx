import type { ReactNode } from 'react'

/** Marca "EJ" del diseño. Reutilizada por el panel de marca y la barra mobile. */
function Isotipo({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-[10px] bg-sage-200 font-bold text-sage-800 ${className}`}
    >
      EJ
    </div>
  )
}

/**
 * Split de autenticación: panel de marca a la izquierda (desde lg) y el
 * formulario a la derecha. En mobile el panel se colapsa a una barra superior.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      {/* Panel de marca — solo desktop */}
      <div className="hidden flex-col justify-between bg-sage-800 px-14 py-16 text-sage-50 lg:flex">
        <div className="flex items-center gap-3">
          <Isotipo className="size-[34px] text-[15px]" />
          <div className="text-[17px] font-semibold tracking-tight">Estética JS</div>
        </div>

        <div className="flex max-w-[420px] flex-col gap-5">
          <h1 className="text-pretty text-[40px] font-semibold leading-[1.15] tracking-[-0.025em]">
            Todo tu consultorio, ordenado en un solo lugar.
          </h1>
          <p className="text-pretty text-base leading-relaxed text-sage-300">
            Pacientes, historias clínicas, turnos, sesiones, fotos de evolución y pagos. Cada
            profesional trabaja en su propio espacio privado.
          </p>
        </div>

        <div className="text-[13px] text-sage-500">
          Acceso solo para cuentas creadas por administración.
        </div>
      </div>

      {/* Barra de marca — solo mobile */}
      <div className="flex items-center gap-[11px] bg-sage-800 px-5 py-[22px] text-sage-50 lg:hidden">
        <Isotipo className="size-8 text-sm" />
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold">Estética JS</span>
          <span className="text-[11.5px] text-sage-300">Gestión de consultorio</span>
        </div>
      </div>

      <div className="flex items-center justify-center bg-sand-100 px-6 py-12">{children}</div>
    </div>
  )
}
