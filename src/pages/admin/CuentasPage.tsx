import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarProfesionales } from '../../api/endpoints/admin'
import { useAuth } from '../../auth/useAuth'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton, SinResultados } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha, iniciales } from '../../lib/fecha'
import type { ProfesionalResponse } from '../../types/api'
import { CuentaFormModal } from './CuentaFormModal'
import { EliminarCuentaModal } from './EliminarCuentaModal'
import { ResetearClaveModal } from './ResetearClaveModal'

type Modal =
  | { tipo: 'crear' }
  | { tipo: 'editar'; cuenta: ProfesionalResponse }
  | { tipo: 'clave'; cuenta: ProfesionalResponse }
  | { tipo: 'eliminar'; cuenta: ProfesionalResponse }

export function CuentasPage() {
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Modal | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const { perfil } = useAuth()

  const { data: cuentas, isPending, error } = useQuery({
    queryKey: ['admin', 'profesionales'],
    queryFn: listarProfesionales,
  })

  // El endpoint no acepta filtros, así que la búsqueda es local sobre la lista
  // ya traída. Es un listado de cuentas de un centro: no va a crecer a miles.
  const filtradas = useMemo(() => {
    if (!cuentas) return []
    const termino = busqueda.trim().toLowerCase()
    if (termino === '') return cuentas

    return cuentas.filter((c) =>
      [c.nombre, c.apellido, c.email, c.especialidad ?? '']
        .join(' ')
        .toLowerCase()
        .includes(termino),
    )
  }, [cuentas, busqueda])

  function cerrarConAviso(mensaje: string) {
    setModal(null)
    setAviso(mensaje)
  }

  const acciones: Acciones = {
    editar: (cuenta) => setModal({ tipo: 'editar', cuenta }),
    clave: (cuenta) => setModal({ tipo: 'clave', cuenta }),
    eliminar: (cuenta) => setModal({ tipo: 'eliminar', cuenta }),
    // AdminService.findAll() no filtra por rol: la propia cuenta de admin
    // aparece en el listado. Borrarla dejaría al sistema sin quien cree
    // profesionales, y editar el email propio es pisar la sesión en curso.
    esPropia: (cuenta) => cuenta.id === perfil?.id,
  }

  return (
    <>
      <PageHeader
        titulo="Cuentas"
        subtitulo="Altas, edición y contraseñas de las profesionales."
        accion={<Button onClick={() => setModal({ tipo: 'crear' })}>Nueva cuenta</Button>}
      />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:gap-[22px] app:px-[34px] app:pb-15 app:pt-7">
        <div className="flex w-full max-w-[280px] flex-col gap-2 rounded-2xl border border-sand-200 bg-sand-50 p-5">
          <span className="text-[12.5px] font-medium text-sand-700">Cuentas creadas</span>
          <span className="text-[26px] font-semibold leading-none text-sage-800">
            {cuentas?.length ?? '—'}
          </span>
          {/* findAll() sin filtro por rol: la cuenta de administración también viene. */}
          <span className="text-xs text-sage-500">Incluye la cuenta de administración</span>
        </div>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, email o especialidad"
          aria-label="Buscar cuentas"
          className="w-full rounded-control border border-sand-300 bg-sand-50 px-[14px] py-2.5 text-[13.5px] placeholder:text-sand-500"
        />

        {isPending && <Skeleton />}
        {error && <ErrorDeCarga error={error} />}

        {cuentas && (
          <>
            <TablaCuentas
              cuentas={filtradas}
              hayBusqueda={busqueda.trim() !== ''}
              acciones={acciones}
            />
            <TarjetasCuentas
              cuentas={filtradas}
              hayBusqueda={busqueda.trim() !== ''}
              acciones={acciones}
            />
          </>
        )}
      </div>

      {modal?.tipo === 'crear' && (
        <CuentaFormModal onCerrar={() => setModal(null)} onListo={cerrarConAviso} />
      )}
      {modal?.tipo === 'editar' && (
        <CuentaFormModal
          cuenta={modal.cuenta}
          onCerrar={() => setModal(null)}
          onListo={cerrarConAviso}
        />
      )}
      {modal?.tipo === 'clave' && (
        <ResetearClaveModal
          cuenta={modal.cuenta}
          onCerrar={() => setModal(null)}
          onListo={cerrarConAviso}
        />
      )}
      {modal?.tipo === 'eliminar' && (
        <EliminarCuentaModal
          cuenta={modal.cuenta}
          onCerrar={() => setModal(null)}
          onListo={cerrarConAviso}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </>
  )
}

interface Acciones {
  editar: (cuenta: ProfesionalResponse) => void
  clave: (cuenta: ProfesionalResponse) => void
  eliminar: (cuenta: ProfesionalResponse) => void
  esPropia: (cuenta: ProfesionalResponse) => boolean
}

const VACIO = {
  conBusqueda: {
    titulo: 'No hay cuentas con ese criterio',
    detalle: 'Probá con otra búsqueda o creá una cuenta nueva.',
  },
  sinBusqueda: {
    titulo: 'Todavía no hay cuentas creadas',
    detalle: 'Las profesionales solo pueden entrar con una cuenta creada desde acá.',
  },
}

/** Tabla — desde 860px. */
function TablaCuentas({
  cuentas,
  hayBusqueda,
  acciones,
}: {
  cuentas: ProfesionalResponse[]
  hayBusqueda: boolean
  acciones: Acciones
}) {
  const vacio = hayBusqueda ? VACIO.conBusqueda : VACIO.sinBusqueda

  return (
    <div className="hidden min-w-0 overflow-x-auto rounded-2xl border border-sand-200 bg-sand-50 app:block">
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[1.6fr_1.6fr_1fr_0.9fr_240px] gap-[14px] border-b border-sand-200 px-5 py-[13px] text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
          <span>Cuenta</span>
          <span>Email</span>
          <span>Teléfono</span>
          <span>Alta</span>
          <span>Acciones</span>
        </div>

        {cuentas.map((cuenta) => (
          <div
            key={cuenta.id}
            className="grid grid-cols-[1.6fr_1.6fr_1fr_0.9fr_240px] gap-[14px] border-b border-sand-200/60 px-5 py-3.5 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-[11px]">
              <span className="flex size-8 flex-none items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700">
                {iniciales(cuenta.nombre, cuenta.apellido)}
              </span>
              <span className="flex min-w-0 flex-col">
                {/* El chip va fuera del truncate: adentro se corta con el nombre. */}
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {cuenta.nombre} {cuenta.apellido}
                  </span>
                  {acciones.esPropia(cuenta) && (
                    <span className="flex-none rounded-full bg-sage-100 px-2 py-0.5 text-[10.5px] font-semibold text-sage-700">
                      Vos
                    </span>
                  )}
                </span>
                <span className="truncate text-[11.5px] text-sage-500">
                  {cuenta.especialidad ?? 'Sin especialidad'}
                </span>
              </span>
            </div>
            <span className="self-center truncate text-[13.5px] text-sage-700">{cuenta.email}</span>
            <span className="self-center text-[13.5px] text-sage-700">{cuenta.telefono}</span>
            <span className="self-center text-[13px] text-sage-700">
              {formatearFecha(cuenta.creadoEn)}
            </span>
            <AccionesCuenta cuenta={cuenta} acciones={acciones} />
          </div>
        ))}

        {cuentas.length === 0 && <SinResultados titulo={vacio.titulo} detalle={vacio.detalle} />}
      </div>
    </div>
  )
}

/** Tarjetas — por debajo de 860px. */
function TarjetasCuentas({
  cuentas,
  hayBusqueda,
  acciones,
}: {
  cuentas: ProfesionalResponse[]
  hayBusqueda: boolean
  acciones: Acciones
}) {
  const vacio = hayBusqueda ? VACIO.conBusqueda : VACIO.sinBusqueda

  return (
    <div className="flex flex-col gap-2.5 app:hidden">
      {cuentas.map((cuenta) => (
        <div
          key={cuenta.id}
          className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 flex-none items-center justify-center rounded-full bg-sage-100 text-[13px] font-semibold text-sage-700">
              {iniciales(cuenta.nombre, cuenta.apellido)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[15px] font-semibold">
                  {cuenta.nombre} {cuenta.apellido}
                </span>
                {acciones.esPropia(cuenta) && (
                  <span className="flex-none rounded-full bg-sage-100 px-2 py-0.5 text-[10.5px] font-semibold text-sage-700">
                    Vos
                  </span>
                )}
              </span>
              <span className="truncate text-[12.5px] text-sand-700">{cuenta.email}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-sand-700">
            <span>{cuenta.especialidad ?? 'Sin especialidad'}</span>
            <span>·</span>
            <span>{cuenta.telefono}</span>
            <span>·</span>
            <span>Alta {formatearFecha(cuenta.creadoEn)}</span>
          </div>
          <AccionesCuenta cuenta={cuenta} acciones={acciones} enTarjeta />
        </div>
      ))}

      {cuentas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-10 text-center text-[13.5px] text-sand-700">
          {vacio.titulo}
        </div>
      )}
    </div>
  )
}

function AccionesCuenta({
  cuenta,
  acciones,
  enTarjeta = false,
}: {
  cuenta: ProfesionalResponse
  acciones: Acciones
  enTarjeta?: boolean
}) {
  const propia = acciones.esPropia(cuenta)

  const base =
    'rounded-[9px] border border-sand-300 bg-white font-semibold text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white'
  const tamano = enTarjeta ? 'min-h-11 px-3 text-[13px]' : 'px-[11px] py-1.5 text-[12.5px]'

  return (
    <div className={enTarjeta ? 'grid grid-cols-3 gap-2' : 'flex items-center gap-[7px] self-center'}>
      <button
        type="button"
        onClick={() => acciones.editar(cuenta)}
        disabled={propia}
        title={propia ? 'Editá tus datos desde tu perfil' : undefined}
        className={`${base} ${tamano}`}
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => acciones.clave(cuenta)}
        disabled={propia}
        title={propia ? 'Cambiá tu contraseña desde tu perfil' : undefined}
        className={`${base} ${tamano}`}
      >
        Clave
      </button>
      <button
        type="button"
        onClick={() => acciones.eliminar(cuenta)}
        disabled={propia}
        title={propia ? 'No podés eliminar tu propia cuenta' : 'Eliminar cuenta'}
        className={`rounded-[9px] border border-clay-400 bg-white font-semibold text-clay-500 transition-colors hover:bg-clay-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white ${tamano}`}
      >
        {enTarjeta ? 'Eliminar' : '✕'}
      </button>
    </div>
  )
}
