import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { cambiarEstadoPaciente, getPaciente } from '../../api/endpoints/pacientes'
import { PageHeader } from '../../components/PageHeader'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { edad, formatearFecha, iniciales } from '../../lib/fecha'
import { cargado, oGuion, unir } from '../../lib/formato'
import type { PacienteResponse } from '../../types/api'
import { PacienteFormModal } from './PacienteFormModal'
import { TurnosDelPaciente } from './TurnosDelPaciente'

/**
 * Pestañas de la ficha, tal cual el diseño. Cada una es una pantalla en sí
 * misma; por ahora sólo "Datos" está construida y el resto avisa que viene.
 */
const TABS = [
  { clave: 'datos', label: 'Datos' },
  { clave: 'hc', label: 'Historia clínica' },
  { clave: 'mrs', label: 'Menopausia (MRS)' },
  { clave: 'turnos', label: 'Turnos' },
  { clave: 'sesiones', label: 'Sesiones' },
  { clave: 'fotos', label: 'Fotos de evolución' },
  { clave: 'pagos', label: 'Pagos' },
] as const

type Tab = (typeof TABS)[number]['clave']

export function PacienteDetallePage() {
  const { id = '' } = useParams()

  const [tab, setTab] = useState<Tab>('datos')
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: paciente, isPending, error } = useQuery({
    queryKey: ['pacientes', id],
    queryFn: () => getPaciente(id),
  })

  const estado = useMutation({
    mutationFn: (activo: boolean) => cambiarEstadoPaciente(id, activo),
    onSuccess: async (_texto, activo) => {
      await queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      setAviso(
        activo
          ? 'Paciente reactivado.'
          : 'Paciente archivado. Se conserva todo su historial.',
      )
    },
    onError: (e: Error) => {
      setAviso(e instanceof ApiError ? e.message : 'No pudimos cambiar el estado.')
    },
  })

  return (
    <>
      <PageHeader
        titulo={paciente ? `${paciente.nombre} ${paciente.apellido}` : 'Ficha del paciente'}
        subtitulo="Ficha completa del paciente"
      />

      <div className="flex w-full max-w-[1420px] flex-col gap-[18px] px-4 pb-25 pt-4 app:gap-[18px] app:px-[34px] app:pb-15 app:pt-7">
        <Link
          to="/pacientes"
          className="self-start text-[13px] text-sand-700 transition-colors hover:text-sage-800"
        >
          ← Volver a pacientes
        </Link>

        {isPending && <Skeleton filas={4} />}
        {error && <ErrorDeCarga error={error}>{mensajeExtra(error)}</ErrorDeCarga>}

        {paciente && (
          <>
            <Encabezado
              paciente={paciente}
              onEditar={() => setEditando(true)}
              onCambiarEstado={() => estado.mutate(!paciente.activo)}
              cambiandoEstado={estado.isPending}
            />

            <div className="flex flex-wrap gap-[5px] border-b border-sand-200">
              {TABS.map(({ clave, label }) => (
                <button
                  key={clave}
                  type="button"
                  onClick={() => setTab(clave)}
                  aria-current={tab === clave ? 'page' : undefined}
                  className={`border-b-2 px-[15px] py-2.5 text-[13.5px] transition-colors ${
                    tab === clave
                      ? 'border-sage-600 font-semibold text-sage-900'
                      : 'border-transparent font-medium text-sand-700 hover:text-sage-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'datos' && <Datos paciente={paciente} />}

            {tab === 'turnos' && (
              <TurnosDelPaciente
                pacienteId={paciente.id}
                nombrePaciente={`${paciente.nombre} ${paciente.apellido}`}
                activo={paciente.activo}
              />
            )}

            {tab !== 'datos' && tab !== 'turnos' && (
              <TabPendiente label={TABS.find((t) => t.clave === tab)?.label ?? ''} />
            )}
          </>
        )}
      </div>

      {editando && paciente && (
        <PacienteFormModal
          paciente={paciente}
          onCerrar={() => setEditando(false)}
          onListo={(mensaje) => {
            setEditando(false)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </>
  )
}

/** El backend es multi-tenant: la ficha de otra profesional no da 403, da 404. */
function mensajeExtra(error: Error) {
  if (!(error instanceof ApiError) || error.status !== 404) return undefined
  return (
    <span className="mt-1 block">
      Puede que la hayas eliminado, o que pertenezca a otra profesional.
    </span>
  )
}

function Encabezado({
  paciente,
  onEditar,
  onCambiarEstado,
  cambiandoEstado,
}: {
  paciente: PacienteResponse
  onEditar: () => void
  onCambiarEstado: () => void
  cambiandoEstado: boolean
}) {
  const resumen = [
    edad(paciente.fechaNacimiento),
    paciente.telefono,
    cargado(paciente.obraSocial) ? paciente.obraSocial : 'Particular',
  ].join(' · ')

  const boton =
    'rounded-[11px] border border-sand-300 bg-white px-[15px] py-2.5 text-[13px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-60 app:min-h-0 min-h-11'

  return (
    <div className="flex flex-wrap items-center gap-[18px] rounded-2xl border border-sand-200 bg-sand-50 p-[22px]">
      <div className="flex size-15 flex-none items-center justify-center rounded-full bg-sage-200 text-xl font-semibold text-sage-800">
        {iniciales(paciente.nombre, paciente.apellido)}
      </div>

      <div className="flex min-w-0 flex-col gap-[5px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
            {paciente.nombre} {paciente.apellido}
          </h2>
          <span
            className={`inline-flex flex-none items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              paciente.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-sand-200 text-sand-700'
            }`}
          >
            {paciente.activo ? 'Activo' : 'Archivado'}
          </span>
        </div>
        <div className="text-[13px] text-sand-700">{resumen}</div>
      </div>

      <div className="flex flex-wrap gap-[9px] app:ml-auto">
        <button type="button" onClick={onEditar} className={boton}>
          Editar ficha
        </button>
        <button
          type="button"
          onClick={onCambiarEstado}
          disabled={cambiandoEstado}
          className={boton}
        >
          {paciente.activo ? 'Archivar paciente' : 'Reactivar paciente'}
        </button>
      </div>
    </div>
  )
}

function Datos({ paciente }: { paciente: PacienteResponse }) {
  const nacimiento = cargado(paciente.fechaNacimiento)
    ? `${formatearFecha(paciente.fechaNacimiento)} (${edad(paciente.fechaNacimiento)})`
    : '—'

  const filas: [string, string][] = [
    ['Nombre completo', `${paciente.nombre} ${paciente.apellido}`],
    ['DNI / CUIT', paciente.dniCuit],
    ['Fecha de nacimiento', nacimiento],
    ['Teléfono', paciente.telefono],
    ['Email', oGuion(paciente.email)],
    ['Profesión', oGuion(paciente.profesion)],
    ['Domicilio', oGuion(paciente.domicilio)],
    ['Obra social', oGuion(paciente.obraSocial)],
    ['N° de afiliado', oGuion(paciente.numeroObraSocial)],
    [
      'Contacto de emergencia',
      unir([
        paciente.contactoEmergenciaNombre,
        paciente.contactoEmergenciaParentesco,
        paciente.contactoEmergenciaTelefono,
      ]),
    ],
    ['Entidades de traslado', unir([paciente.entidadTraslado1, paciente.entidadTraslado2])],
    ['Alta en el sistema', formatearFecha(paciente.creadoEn)],
  ]

  return (
    <div className="grid gap-4 rounded-2xl border border-sand-200 bg-sand-50 p-6 app:grid-cols-3 app:gap-x-7 app:gap-y-[22px]">
      {filas.map(([label, valor]) => (
        <div key={label} className="flex min-w-0 flex-col gap-[5px]">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
            {label}
          </span>
          <span className="break-words text-sm">{valor}</span>
        </div>
      ))}
    </div>
  )
}

function TabPendiente({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-14 text-center">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-[13px] text-sand-700">Esta pestaña todavía no está construida.</div>
    </div>
  )
}
