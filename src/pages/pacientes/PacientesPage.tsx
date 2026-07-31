import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listarPacientes } from '../../api/endpoints/pacientes'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { edad, iniciales } from '../../lib/fecha'
import type { PacienteResponse } from '../../types/api'
import { PacienteFormModal } from './PacienteFormModal'

type Filtro = 'activos' | 'archivados' | 'todos'

const FILTROS: { clave: Filtro; label: string }[] = [
  { clave: 'activos', label: 'Activos' },
  { clave: 'archivados', label: 'Archivados' },
  { clave: 'todos', label: 'Todos' },
]

/** Igual que el diseño: 5 por página. */
const POR_PAGINA = 5

export function PacientesPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activos')
  const [pagina, setPagina] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const navigate = useNavigate()

  const { data: pacientes, isPending, error } = useQuery({
    queryKey: ['pacientes'],
    queryFn: listarPacientes,
  })

  const filtradas = useMemo(() => {
    if (!pacientes) return []
    const termino = busqueda.trim().toLowerCase()

    return pacientes.filter((p) => {
      if (filtro === 'activos' && !p.activo) return false
      if (filtro === 'archivados' && p.activo) return false
      if (termino === '') return true

      return [p.nombre, p.apellido, p.dniCuit, p.telefono]
        .join(' ')
        .toLowerCase()
        .includes(termino)
    })
  }, [pacientes, busqueda, filtro])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  // Si el filtro o la búsqueda achican el listado, la página actual puede quedar
  // fuera de rango; se acota al renderizar en vez de sincronizar con un efecto.
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * POR_PAGINA
  const visibles = filtradas.slice(desde, desde + POR_PAGINA)

  const infoPagina =
    filtradas.length === 0
      ? 'Sin resultados'
      : `Mostrando ${desde + 1}–${Math.min(desde + POR_PAGINA, filtradas.length)} de ${filtradas.length}`

  function cambiarFiltro(nuevo: Filtro) {
    setFiltro(nuevo)
    setPagina(1)
  }

  function abrirPaciente(paciente: PacienteResponse) {
    navigate(`/pacientes/${paciente.id}`)
  }

  const hayFiltroAplicado = busqueda.trim() !== '' || filtro !== 'todos'

  return (
    <>
      <PageHeader
        titulo="Pacientes"
        subtitulo="Buscá una ficha o cargá un paciente nuevo."
        accion={<Button onClick={() => setModalAbierto(true)}>Nuevo paciente</Button>}
      />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:gap-[22px] app:px-[34px] app:pb-15 app:pt-7">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPagina(1)
            }}
            placeholder="Buscar por nombre, DNI o teléfono"
            aria-label="Buscar pacientes"
            className="min-w-[260px] flex-1 rounded-control border border-sand-300 bg-sand-50 px-[14px] py-2.5 text-[13.5px] placeholder:text-sand-500"
          />

          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-control border border-sand-200 bg-sand-50 p-1">
            {FILTROS.map(({ clave, label }) => (
              <button
                key={clave}
                type="button"
                onClick={() => cambiarFiltro(clave)}
                aria-pressed={filtro === clave}
                className={`flex-none whitespace-nowrap rounded-[9px] px-[13px] py-2.5 text-[12.5px] font-semibold transition-colors app:py-1.5 ${
                  filtro === clave ? 'bg-sage-600 text-white' : 'text-sand-700 hover:bg-sage-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isPending && <Skeleton filas={5} />}
        {error && <ErrorDeCarga error={error} />}

        {pacientes && (
          <>
            <TablaPacientes
              pacientes={visibles}
              vacio={filtradas.length === 0}
              hayFiltroAplicado={hayFiltroAplicado}
              onAbrir={abrirPaciente}
              onNueva={() => setModalAbierto(true)}
              infoPagina={infoPagina}
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              onPagina={setPagina}
            />
            <TarjetasPacientes
              pacientes={visibles}
              vacio={filtradas.length === 0}
              hayFiltroAplicado={hayFiltroAplicado}
              onAbrir={abrirPaciente}
              onNueva={() => setModalAbierto(true)}
              infoPagina={infoPagina}
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              onPagina={setPagina}
            />
          </>
        )}
      </div>

      {modalAbierto && (
        <PacienteFormModal
          onCerrar={() => setModalAbierto(false)}
          onListo={(mensaje) => {
            setModalAbierto(false)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </>
  )
}

interface ListaProps {
  pacientes: PacienteResponse[]
  vacio: boolean
  hayFiltroAplicado: boolean
  onAbrir: (paciente: PacienteResponse) => void
  onNueva: () => void
  infoPagina: string
  paginaActual: number
  totalPaginas: number
  onPagina: (pagina: number) => void
}

function textoVacio(hayFiltroAplicado: boolean) {
  return hayFiltroAplicado
    ? 'Probá con otro término de búsqueda o cambiá el filtro de estado.'
    : 'Cargá tu primer paciente para empezar a agendar turnos.'
}

/**
 * `justify-self-start` es necesario dentro de la tabla: como ítem de grilla el
 * span se estira a todo el ancho de la columna y la píldora deja de ser una
 * píldora. En las tarjetas no molesta porque ahí manda el flex del contenedor.
 */
function BadgeEstado({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex w-fit flex-none items-center justify-self-start rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
        activo ? 'bg-emerald-100 text-emerald-800' : 'bg-sand-200 text-sand-700'
      }`}
    >
      {activo ? 'Activo' : 'Archivado'}
    </span>
  )
}

const COLUMNAS =
  'grid-cols-[minmax(200px,2fr)_minmax(110px,1.1fr)_minmax(150px,1.2fr)_minmax(140px,1.3fr)_100px]'

/** Tabla — desde 860px. */
function TablaPacientes({
  pacientes,
  vacio,
  hayFiltroAplicado,
  onAbrir,
  onNueva,
  infoPagina,
  paginaActual,
  totalPaginas,
  onPagina,
}: ListaProps) {
  return (
    <div className="hidden min-w-0 overflow-x-auto rounded-2xl border border-sand-200 bg-sand-50 app:block">
      <div className="min-w-[860px]">
        <div
          className={`grid ${COLUMNAS} gap-4 border-b border-sand-200 px-5 py-[13px] text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500`}
        >
          <span>Paciente</span>
          <span>DNI / CUIT</span>
          <span>Teléfono</span>
          <span>Obra social</span>
          <span>Estado</span>
        </div>

        {pacientes.map((paciente) => (
          <button
            key={paciente.id}
            type="button"
            onClick={() => onAbrir(paciente)}
            className={`grid w-full ${COLUMNAS} items-center gap-4 border-b border-sand-200/60 px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-sage-50`}
          >
            <span className="flex min-w-0 items-center gap-[11px]">
              <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-sage-100 text-[12.5px] font-semibold text-sage-700">
                {iniciales(paciente.nombre, paciente.apellido)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {paciente.nombre} {paciente.apellido}
                </span>
                <span className="truncate text-xs text-sage-500">
                  {edad(paciente.fechaNacimiento)}
                </span>
              </span>
            </span>
            <span className="text-[13.5px] text-sage-700">{paciente.dniCuit}</span>
            <span className="text-[13.5px] text-sage-700">{paciente.telefono}</span>
            <span className="truncate text-[13.5px] text-sage-700">
              {paciente.obraSocial ?? '—'}
            </span>
            <BadgeEstado activo={paciente.activo} />
          </button>
        ))}

        {vacio && (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <div className="text-sm font-medium">No encontramos pacientes</div>
            <div className="text-[13px] text-sand-700">{textoVacio(hayFiltroAplicado)}</div>
            <button
              type="button"
              onClick={onNueva}
              className="mt-1.5 rounded-[11px] border border-sand-300 bg-white px-[15px] py-2.5 text-[13px] font-semibold text-sage-700 transition-colors hover:bg-sage-50"
            >
              Nuevo paciente
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 px-5 py-[13px]">
          <span className="text-[12.5px] text-sand-700">{infoPagina}</span>
          <span className="ml-auto flex gap-[7px]">
            <BotonPagina
              onClick={() => onPagina(paginaActual - 1)}
              habilitado={paginaActual > 1}
              etiqueta="Anterior"
            />
            <BotonPagina
              onClick={() => onPagina(paginaActual + 1)}
              habilitado={paginaActual < totalPaginas}
              etiqueta="Siguiente"
            />
          </span>
        </div>
      </div>
    </div>
  )
}

function BotonPagina({
  onClick,
  habilitado,
  etiqueta,
}: {
  onClick: () => void
  habilitado: boolean
  etiqueta: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!habilitado}
      className="rounded-[10px] border border-sand-300 bg-white px-[13px] py-1.5 text-[12.5px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-default disabled:text-sand-400 disabled:hover:bg-white"
    >
      {etiqueta}
    </button>
  )
}

/** Tarjetas — por debajo de 860px. */
function TarjetasPacientes({
  pacientes,
  vacio,
  hayFiltroAplicado,
  onAbrir,
  onNueva,
  infoPagina,
  paginaActual,
  totalPaginas,
  onPagina,
}: ListaProps) {
  return (
    <div className="flex flex-col gap-2.5 app:hidden">
      {pacientes.map((paciente) => (
        <button
          key={paciente.id}
          type="button"
          onClick={() => onAbrir(paciente)}
          className="flex min-h-14 w-full items-center gap-[13px] rounded-2xl border border-sand-200 bg-sand-50 p-[15px] text-left"
        >
          <span className="flex size-[42px] flex-none items-center justify-center rounded-full bg-sage-100 text-sm font-semibold text-sage-700">
            {iniciales(paciente.nombre, paciente.apellido)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="truncate text-[15px] font-semibold">
              {paciente.nombre} {paciente.apellido}
            </span>
            <span className="text-[13px] text-sand-700">{paciente.telefono}</span>
            <span className="truncate text-[12.5px] text-sage-500">
              {edad(paciente.fechaNacimiento)} · {paciente.obraSocial ?? '—'}
            </span>
          </span>
          <BadgeEstado activo={paciente.activo} />
        </button>
      ))}

      {vacio && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-10 text-center">
          <div className="text-sm font-medium">No encontramos pacientes</div>
          <div className="text-[13px] text-sand-700">{textoVacio(hayFiltroAplicado)}</div>
          <button
            type="button"
            onClick={onNueva}
            className="mt-1 min-h-11 rounded-control border border-sand-300 bg-white px-[18px] text-sm font-semibold text-sage-700"
          >
            Nuevo paciente
          </button>
        </div>
      )}

      <div className="flex items-center gap-2.5 px-0.5 py-1">
        <span className="text-[12.5px] text-sand-700">{infoPagina}</span>
        <span className="ml-auto flex gap-2">
          <BotonPaginaMobile
            onClick={() => onPagina(paginaActual - 1)}
            habilitado={paginaActual > 1}
            etiqueta="Página anterior"
            simbolo="←"
          />
          <BotonPaginaMobile
            onClick={() => onPagina(paginaActual + 1)}
            habilitado={paginaActual < totalPaginas}
            etiqueta="Página siguiente"
            simbolo="→"
          />
        </span>
      </div>
    </div>
  )
}

function BotonPaginaMobile({
  onClick,
  habilitado,
  etiqueta,
  simbolo,
}: {
  onClick: () => void
  habilitado: boolean
  etiqueta: string
  simbolo: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!habilitado}
      aria-label={etiqueta}
      className="size-11 rounded-control border border-sand-300 bg-white text-[15px] font-semibold text-sage-700 disabled:text-sand-400"
    >
      {simbolo}
    </button>
  )
}
