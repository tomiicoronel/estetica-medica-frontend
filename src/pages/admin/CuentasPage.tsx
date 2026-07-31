import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarProfesionales } from '../../api/endpoints/admin'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton, SinResultados } from '../../components/ui/EstadoCarga'
import { formatearFecha, iniciales } from '../../lib/fecha'
import type { ProfesionalResponse } from '../../types/api'

export function CuentasPage() {
  const [busqueda, setBusqueda] = useState('')

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

  return (
    <>
      <PageHeader
        titulo="Cuentas"
        subtitulo="Altas, edición y contraseñas de las profesionales."
        accion={<Button>Nueva cuenta</Button>}
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
            <TablaCuentas cuentas={filtradas} hayBusqueda={busqueda.trim() !== ''} />
            <TarjetasCuentas cuentas={filtradas} hayBusqueda={busqueda.trim() !== ''} />
          </>
        )}
      </div>
    </>
  )
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
}: {
  cuentas: ProfesionalResponse[]
  hayBusqueda: boolean
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
                <span className="truncate text-sm font-medium">
                  {cuenta.nombre} {cuenta.apellido}
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
            <AccionesCuenta />
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
}: {
  cuentas: ProfesionalResponse[]
  hayBusqueda: boolean
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
              <span className="truncate text-[15px] font-semibold">
                {cuenta.nombre} {cuenta.apellido}
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
          <AccionesCuenta enTarjeta />
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

/**
 * Acciones por cuenta. Todavía sin conectar: editar, resetear contraseña y
 * eliminar entran en el próximo paso, cada una con su confirmación.
 */
function AccionesCuenta({ enTarjeta = false }: { enTarjeta?: boolean }) {
  const base =
    'rounded-[9px] border border-sand-300 bg-white font-semibold text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className={enTarjeta ? 'grid grid-cols-3 gap-2' : 'flex items-center gap-[7px] self-center'}>
      <button type="button" disabled className={`${base} ${enTarjeta ? 'min-h-11 px-3 text-[13px]' : 'px-[11px] py-1.5 text-[12.5px]'}`}>
        Editar
      </button>
      <button type="button" disabled className={`${base} ${enTarjeta ? 'min-h-11 px-3 text-[13px]' : 'px-[11px] py-1.5 text-[12.5px]'}`}>
        Clave
      </button>
      <button
        type="button"
        disabled
        title="Eliminar cuenta"
        className={`rounded-[9px] border border-clay-400 bg-white font-semibold text-clay-500 transition-colors hover:bg-clay-100 disabled:cursor-not-allowed disabled:opacity-50 ${
          enTarjeta ? 'min-h-11 px-3 text-[13px]' : 'px-[11px] py-1.5 text-[12.5px]'
        }`}
      >
        {enTarjeta ? 'Eliminar' : '✕'}
      </button>
    </div>
  )
}
