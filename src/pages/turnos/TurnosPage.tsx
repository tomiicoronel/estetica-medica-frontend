import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarPacientes } from '../../api/endpoints/pacientes'
import { listarTurnosPagina } from '../../api/endpoints/turnos'
import { PageHeader } from '../../components/PageHeader'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CampoFecha } from '../../components/ui/CampoFecha'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha } from '../../lib/fecha'
import { formatearHora, formatearMonto } from '../../lib/formato'
import type { EstadoTurno, SesionClinicaResponse, TurnoResponse, UUID } from '../../types/api'
import { PagoFormModal } from '../pagos/PagoFormModal'
import { SesionFormModal } from '../sesiones/SesionFormModal'
import { TurnoDetalleModal } from './TurnoDetalleModal'
import { TurnoFormModal } from './TurnoFormModal'

type FiltroEstado = EstadoTurno | 'todos'

const ESTADOS: { clave: FiltroEstado; label: string }[] = [
  { clave: 'todos', label: 'Todos' },
  { clave: 'PENDIENTE', label: 'Pendientes' },
  { clave: 'CONFIRMADO', label: 'Confirmados' },
  { clave: 'REALIZADO', label: 'Realizados' },
  { clave: 'CANCELADO', label: 'Cancelados' },
]

const POR_PAGINA = 10

export function TurnosPage() {
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const [fecha, setFecha] = useState('')
  const [pagina, setPagina] = useState(0)
  const [creando, setCreando] = useState(false)
  const [abierto, setAbierto] = useState<UUID | null>(null)
  const [sesionDe, setSesionDe] = useState<{
    turnoId: UUID
    sesion: SesionClinicaResponse | undefined
  } | null>(null)
  const [pagoDe, setPagoDe] = useState<{ turnoId: UUID; deuda: number } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const { data: page, isPending, error } = useQuery({
    queryKey: ['turnos', 'pagina', { estado, fecha, pagina }],
    queryFn: () =>
      listarTurnosPagina({
        page: pagina,
        size: POR_PAGINA,
        estado: estado === 'todos' ? undefined : estado,
        fecha: fecha === '' ? undefined : fecha,
      }),
    // Al cambiar de página o de filtro, mantener la página previa evita que la
    // tabla parpadee a skeleton entre una y otra.
    placeholderData: (previa) => previa,
  })

  // TurnoResponse sólo trae pacienteId; el nombre sale de acá.
  const pacientes = useQuery({ queryKey: ['pacientes'], queryFn: listarPacientes })

  const nombrePorPaciente = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of pacientes.data ?? []) mapa.set(p.id, `${p.nombre} ${p.apellido}`)
    return mapa
  }, [pacientes.data])

  const nombreDe = (turno: TurnoResponse) =>
    nombrePorPaciente.get(turno.pacienteId) ?? 'Paciente'

  // Se busca por id y no se guarda el objeto: al cambiar el estado la query se
  // refresca y el modal tiene que mostrar el turno nuevo, no el que se clickeó.
  const turnoAbierto = page?.contenido.find((t) => t.id === abierto)

  const hayFiltros = estado !== 'todos' || fecha !== ''

  function cambiarEstado(nuevo: FiltroEstado) {
    setEstado(nuevo)
    setPagina(0)
  }

  function cambiarFecha(nueva: string) {
    setFecha(nueva)
    setPagina(0)
  }

  const desde = page ? page.pagina * page.tamano : 0
  const infoPagina = !page
    ? ''
    : page.totalElementos === 0
      ? 'Sin resultados'
      : `Mostrando ${desde + 1}–${Math.min(desde + page.tamano, page.totalElementos)} de ${page.totalElementos}`

  return (
    <>
      <PageHeader
        titulo="Turnos"
        subtitulo="Tu agenda completa."
        accion={<Button onClick={() => setCreando(true)}>Nuevo turno</Button>}
      />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:gap-[22px] app:px-[34px] app:pb-15 app:pt-7">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-control border border-sand-200 bg-sand-50 p-1">
            {ESTADOS.map(({ clave, label }) => (
              <button
                key={clave}
                type="button"
                onClick={() => cambiarEstado(clave)}
                aria-pressed={estado === clave}
                className={`flex-none whitespace-nowrap rounded-[9px] px-[13px] py-2.5 text-[12.5px] font-semibold transition-colors app:py-1.5 ${
                  estado === clave ? 'bg-sage-600 text-white' : 'text-sand-700 hover:bg-sage-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="w-[200px]">
            <CampoFecha label="Día" value={fecha} onChange={cambiarFecha} />
          </div>

          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setEstado('todos')
                setFecha('')
                setPagina(0)
              }}
              className="pb-3 text-[13px] text-sand-700 underline transition-colors hover:text-sage-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {isPending && <Skeleton filas={5} />}
        {error && <ErrorDeCarga error={error} />}

        {page && (
          <>
            <Tabla turnos={page.contenido} nombreDe={nombreDe} onAbrir={setAbierto} />
            <Tarjetas turnos={page.contenido} nombreDe={nombreDe} onAbrir={setAbierto} />

            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-sand-700">{infoPagina}</span>
              <span className="ml-auto flex gap-2">
                <BotonPagina
                  onClick={() => setPagina(pagina - 1)}
                  habilitado={!page.primera}
                  etiqueta="Anterior"
                />
                <BotonPagina
                  onClick={() => setPagina(pagina + 1)}
                  habilitado={!page.ultima}
                  etiqueta="Siguiente"
                />
              </span>
            </div>
          </>
        )}
      </div>

      {creando && (
        <TurnoFormModal
          onCerrar={() => setCreando(false)}
          onListo={(mensaje) => {
            setCreando(false)
            setAviso(mensaje)
          }}
        />
      )}

      {turnoAbierto && (
        <TurnoDetalleModal
          turno={turnoAbierto}
          nombrePaciente={nombreDe(turnoAbierto)}
          onCerrar={() => setAbierto(null)}
          onListo={setAviso}
          onSesion={(sesion) => {
            setSesionDe({ turnoId: turnoAbierto.id, sesion })
            setAbierto(null)
          }}
          onPago={(deuda) => {
            setPagoDe({ turnoId: turnoAbierto.id, deuda })
            setAbierto(null)
          }}
        />
      )}

      {pagoDe && (
        <PagoFormModal
          turnoId={pagoDe.turnoId}
          deuda={pagoDe.deuda}
          onCerrar={() => setPagoDe(null)}
          onListo={(mensaje) => {
            setPagoDe(null)
            setAviso(mensaje)
          }}
        />
      )}

      {sesionDe && (
        <SesionFormModal
          turnoId={sesionDe.turnoId}
          sesion={sesionDe.sesion}
          onCerrar={() => setSesionDe(null)}
          onListo={(mensaje) => {
            setSesionDe(null)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </>
  )
}

interface ListaProps {
  turnos: TurnoResponse[]
  nombreDe: (turno: TurnoResponse) => string
  onAbrir: (id: UUID) => void
}

const COLUMNAS = 'grid-cols-[150px_minmax(150px,1.4fr)_minmax(190px,1.6fr)_130px_110px]'

function serviciosDe(turno: TurnoResponse): string {
  return turno.servicios.map((s) => s.nombre).join(' · ') || '—'
}

const VACIO = {
  titulo: 'Sin turnos para este filtro',
  detalle: 'Cambiá el estado o el día para ver otros turnos.',
}

/** Tabla — desde 860px. */
function Tabla({ turnos, nombreDe, onAbrir }: ListaProps) {
  return (
    <div className="hidden min-w-0 overflow-x-auto rounded-2xl border border-sand-200 bg-sand-50 app:block">
      <div className="min-w-[840px]">
        <div
          className={`grid ${COLUMNAS} gap-4 border-b border-sand-200 px-5 py-[13px] text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500`}
        >
          <span>Fecha y hora</span>
          <span>Paciente</span>
          <span>Servicios</span>
          <span>Estado</span>
          <span>Monto</span>
        </div>

        {turnos.map((turno) => (
          <button
            key={turno.id}
            type="button"
            onClick={() => onAbrir(turno.id)}
            className={`grid w-full ${COLUMNAS} items-center gap-4 border-b border-sand-200/60 px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-sage-50`}
          >
            <span className="flex flex-col">
              <span className="text-[13.5px] font-semibold text-sage-800">
                {formatearFecha(turno.fechaHora)}
              </span>
              <span className="text-xs text-sage-500">{formatearHora(turno.fechaHora)} hs</span>
            </span>
            <span className="truncate text-sm font-medium">{nombreDe(turno)}</span>
            <span className="truncate text-[13px] text-sand-700">{serviciosDe(turno)}</span>
            <BadgeEstadoTurno estado={turno.estado} />
            <span className="text-[13.5px] font-semibold">{formatearMonto(turno.montoTotal)}</span>
          </button>
        ))}

        {turnos.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <div className="text-sm font-medium">{VACIO.titulo}</div>
            <div className="text-[13px] text-sand-700">{VACIO.detalle}</div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Tarjetas — por debajo de 860px. */
function Tarjetas({ turnos, nombreDe, onAbrir }: ListaProps) {
  return (
    <div className="flex flex-col gap-2.5 app:hidden">
      {turnos.map((turno) => (
        <button
          key={turno.id}
          type="button"
          onClick={() => onAbrir(turno.id)}
          className="flex w-full flex-col gap-[9px] rounded-2xl border border-sand-200 bg-sand-50 p-[15px] text-left"
        >
          <span className="flex w-full items-center gap-2.5">
            <span className="text-sm font-semibold text-sage-800">
              {formatearFecha(turno.fechaHora)} · {formatearHora(turno.fechaHora)} hs
            </span>
            <span className="ml-auto">
              <BadgeEstadoTurno estado={turno.estado} />
            </span>
          </span>
          <span className="text-[15px] font-semibold">{nombreDe(turno)}</span>
          <span className="flex w-full items-end gap-3">
            <span className="flex-1 text-[13px] leading-[1.45] text-sand-700">
              {serviciosDe(turno)}
            </span>
            <span className="flex-none text-[15px] font-semibold text-sage-800">
              {formatearMonto(turno.montoTotal)}
            </span>
          </span>
        </button>
      ))}

      {turnos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-10 text-center text-[13.5px] text-sand-700">
          {VACIO.titulo}
        </div>
      )}
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
      className="min-h-11 rounded-[10px] border border-sand-300 bg-white px-[13px] text-[12.5px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-default disabled:text-sand-400 disabled:hover:bg-white app:min-h-0 app:py-1.5"
    >
      {etiqueta}
    </button>
  )
}
