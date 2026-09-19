import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  defaultTranslations,
  IlamyCalendar,
  useIlamyCalendarContext,
  type CalendarEvent,
  type CalendarView,
  type CellInfo,
} from '@ilamy/calendar'
import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { listarBloqueos } from '../../api/endpoints/bloqueos'
import { listarPacientes } from '../../api/endpoints/pacientes'
import {
  actualizarTurno,
  listarTurnosEnRango,
  listarTurnosPagina,
} from '../../api/endpoints/turnos'
import { ApiError } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CampoFecha } from '../../components/ui/CampoFecha'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha } from '../../lib/fecha'
import { ETIQUETA_ESTADO, formatearHora, formatearMonto } from '../../lib/formato'
import {
  appointmentUpdateFromEvent,
  bloqueoACalendarEvent,
  calendarDraftFromSelection,
  COLORES_ESTADO,
  crearRangoSemanal,
  serializarRangoVisible,
  textosEvento,
  turnoACalendarEvent,
  type CalendarDraft,
} from '../../lib/calendario'
import type { EstadoTurno, SesionClinicaResponse, TurnoResponse, UUID } from '../../types/api'
import { PagoFormModal } from '../pagos/PagoFormModal'
import { SesionFormModal } from '../sesiones/SesionFormModal'
import { TurnoDetalleModal } from './TurnoDetalleModal'
import { TurnoFormModal } from './TurnoFormModal'

type FiltroEstado = EstadoTurno | 'todos'

const ESTADOS: { clave: FiltroEstado; label: string }[] = [
  { clave: 'todos', label: 'Activos' },
  { clave: 'PENDIENTE', label: 'Pendientes' },
  { clave: 'CONFIRMADO', label: 'Confirmados' },
  { clave: 'REALIZADO', label: 'Realizados' },
  { clave: 'CANCELADO', label: 'Cancelados' },
]

const POR_PAGINA = 10
const VISTAS: { clave: CalendarView; label: string }[] = [
  { clave: 'day', label: 'Día' },
  { clave: 'week', label: 'Semana' },
  { clave: 'month', label: 'Mes' },
]

export function TurnosPage() {
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const [fecha, setFecha] = useState('')
  const [pagina, setPagina] = useState(0)
  const [creando, setCreando] = useState(false)
  const [creationDraft, setCreationDraft] = useState<CalendarDraft | null>(null)
  const [editando, setEditando] = useState<TurnoResponse | null>(null)
  const [abierto, setAbierto] = useState<UUID | null>(null)
  const [sesionDe, setSesionDe] = useState<{
    turnoId: UUID
    sesion: SesionClinicaResponse | undefined
  } | null>(null)
  const [pagoDe, setPagoDe] = useState<{ turnoId: UUID; deuda: number } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [rangoAgenda, setRangoAgenda] = useState(() => crearRangoSemanal(dayjs()))
  const queryClient = useQueryClient()

  const openCreation = useCallback((selection?: Pick<CellInfo, 'start' | 'end'>) => {
    setCreationDraft(selection ? calendarDraftFromSelection(selection) : null)
    setCreando(true)
  }, [])
  const dragToCreate = useMemo(
    () => dragToCreatePlugin({ onSelect: (selection) => openCreation(selection) }),
    [openCreation],
  )

  const rangoQuery = useMemo(() => serializarRangoVisible(rangoAgenda), [rangoAgenda])
  const agenda = useQuery({
    queryKey: ['turnos', 'agenda', rangoQuery],
    queryFn: () => listarTurnosEnRango(rangoQuery),
    placeholderData: (previa) => previa,
  })
  const bloqueos = useQuery({ queryKey: ['bloqueos'], queryFn: listarBloqueos })

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

  const eventos = useMemo(
    () => [
      ...(agenda.data ?? []).map((turno) =>
        turnoACalendarEvent(turno, nombrePorPaciente.get(turno.pacienteId) ?? 'Paciente'),
      ),
      ...(bloqueos.data ?? []).map(bloqueoACalendarEvent),
    ],
    [agenda.data, bloqueos.data, nombrePorPaciente],
  )
  const errorAgenda = agenda.error ?? bloqueos.error ?? pacientes.error

  const calendarUpdate = useMutation({
    mutationFn: ({ turno, event }: { turno: TurnoResponse; event: CalendarEvent }) => {
      const update = appointmentUpdateFromEvent(turno, event)
      if (!update) throw new Error('appointment_not_editable')
      return actualizarTurno(turno.id, update)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      setAviso('Turno reprogramado.')
    },
    onError: async (mutationError) => {
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      setAviso(
        mutationError instanceof ApiError
          ? mutationError.message
          : 'No pudimos reprogramar el turno. Se restauró el horario anterior.',
      )
    },
  })

  async function updateCalendarEvent(event: CalendarEvent) {
    const id = event.data?.turnoId
    const turno = typeof id === 'string' ? agenda.data?.find((item) => item.id === id) : undefined

    if (!turno) {
      setAviso('Los bloqueos se administran desde Disponibilidad.')
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      return
    }
    if (!appointmentUpdateFromEvent(turno, event)) {
      setAviso('Los turnos realizados o cancelados no se pueden reprogramar.')
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      return
    }
    calendarUpdate.mutate({ turno, event })
  }

  // Se busca por id y no se guarda el objeto: al cambiar el estado la query se
  // refresca y el modal tiene que mostrar el turno nuevo, no el que se clickeó.
  const turnoAbierto =
    agenda.data?.find((turno) => turno.id === abierto) ??
    page?.contenido.find((turno) => turno.id === abierto)

  const hayFiltros = estado !== 'todos' || fecha !== ''

  // Al cambiar de filtro se olvida el turno abierto: si quedó fuera de la lista
  // (p. ej. recién cancelado en "Activos"), no tiene que reabrirse solo en otra pestaña.
  function cambiarEstado(nuevo: FiltroEstado) {
    setEstado(nuevo)
    setPagina(0)
    setAbierto(null)
  }

  function cambiarFecha(nueva: string) {
    setFecha(nueva)
    setPagina(0)
    setAbierto(null)
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
        accion={<Button onClick={() => openCreation()}>Nuevo turno</Button>}
      />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:gap-[22px] app:px-[34px] app:pb-15 app:pt-7">
        <section aria-label="Agenda semanal" className="flex flex-col gap-3">
          {errorAgenda && <ErrorDeCarga error={errorAgenda} />}
          {(agenda.isPending || bloqueos.isPending || pacientes.isPending) && <Skeleton filas={4} />}

          {/* The library draws grid lines with `bg-border`; overriding --border here softens
              them without touching the global token. */}
          <div
            style={{ '--border': 'var(--color-sand-200)' } as CSSProperties}
            className="[&_*]:border-sand-200 h-[70dvh] min-h-[520px] max-h-[820px] overflow-hidden rounded-[20px] border border-sand-200 bg-sand-50 p-3 app:p-4"
          >
            <IlamyCalendar
              events={eventos}
              initialView="week"
              firstDayOfWeek="monday"
              locale="es"
              translations={TRADUCCIONES}
              timeFormat="24-hour"
              businessHours={{
                daysOfWeek: [
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                  'saturday',
                  'sunday',
                ],
                startTime: '08:00',
                endTime: '20:00',
              }}
              scrollTime="08:00:00"
              dayMaxEvents={3}
              eventHeight={38}
              stickyViewHeader
              hideExportButton
              plugins={[dragToCreate]}
              headerComponent={<CabeceraAgenda />}
              renderEvent={(event) => <EventoAgenda event={event} />}
              onDateChange={(_fechaActual, rango) =>
                setRangoAgenda({ inicio: rango.start, fin: rango.end })
              }
              onCellClick={(selection) => openCreation(selection)}
              onEventUpdate={updateCalendarEvent}
              onEventClick={(event) => {
                if (event.data?.tipo === 'turno' && typeof event.data.turnoId === 'string') {
                  setAbierto(event.data.turnoId)
                }
              }}
            />
          </div>
        </section>

        <h2 className="text-base font-semibold text-sage-900">Lista y filtros</h2>
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
                setAbierto(null)
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
          initialStart={creationDraft?.start}
          initialEnd={creationDraft?.end}
          onCerrar={() => {
            setCreando(false)
            setCreationDraft(null)
          }}
          onListo={(mensaje) => {
            setCreando(false)
            setCreationDraft(null)
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
          onEditar={(turno) => {
            setEditando(turno)
            setAbierto(null)
          }}
          onEliminado={(mensaje) => {
            setAbierto(null)
            setAviso(mensaje)
          }}
        />
      )}

      {editando && (
        <TurnoFormModal
          turno={editando}
          onCerrar={() => setEditando(null)}
          onListo={(mensaje) => {
            setEditando(null)
            setAviso(mensaje)
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

const TRADUCCIONES = {
  ...defaultTranslations,
  today: 'Hoy',
  week: 'Semana',
  day: 'Día',
  month: 'Mes',
  year: 'Año',
  allDay: 'Todo el día',
  more: 'más',
  previous: 'Anterior',
  next: 'Siguiente',
}

const ESTADOS_LEYENDA: EstadoTurno[] = ['PENDIENTE', 'CONFIRMADO', 'REALIZADO', 'CANCELADO']
const BOTON_NAVEGACION =
  'flex min-h-11 items-center justify-center px-3 text-lg text-sage-800 transition-colors hover:bg-sage-50 app:min-h-9'

function CabeceraAgenda() {
  const { currentRange, nextPeriod, prevPeriod, setView, today, view } =
    useIlamyCalendarContext()
  const inicio = currentRange.start.locale('es')
  const fin = currentRange.end.locale('es')
  const titulo = inicio.isSame(fin, 'day')
    ? inicio.format('D [de] MMMM [de] YYYY')
    : `${inicio.format('D MMM')} – ${fin.format('D MMM YYYY')}`

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-1 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex overflow-hidden rounded-xl border border-sand-300 bg-white">
          <button
            type="button"
            aria-label="Período anterior"
            onClick={prevPeriod}
            className={BOTON_NAVEGACION}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Período siguiente"
            onClick={nextPeriod}
            className={`${BOTON_NAVEGACION} border-l border-sand-300`}
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={today}
          className="min-h-11 rounded-xl border border-sand-300 bg-white px-3.5 text-[13px] font-semibold text-sage-800 transition-colors hover:bg-sage-50 app:min-h-9"
        >
          Hoy
        </button>
        <span className="min-w-0 truncate text-sm font-semibold capitalize text-sage-900 app:text-base">
          {titulo}
        </span>
      </div>

      <ul aria-label="Estados" className="ml-auto hidden items-center gap-4 app:flex">
        {ESTADOS_LEYENDA.map((estado) => (
          <li key={estado} className="flex items-center gap-1.5 text-xs text-sand-700">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: COLORES_ESTADO[estado].linea }}
            />
            {ETIQUETA_ESTADO[estado]}
          </li>
        ))}
      </ul>

      <div className="flex rounded-xl bg-sand-100 p-1 max-app:ml-auto">
        {VISTAS.map(({ clave, label }) => (
          <button
            key={clave}
            type="button"
            aria-pressed={view === clave}
            onClick={() => setView(clave)}
            className={`min-h-10 rounded-[9px] px-3 text-xs font-semibold transition-colors app:min-h-8 ${
              view === clave ? 'bg-white text-sage-900 shadow-sm' : 'text-sand-700 hover:bg-sand-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EventoAgenda({ event }: { event: CalendarEvent }) {
  const { titulo, detalle, tachado } = textosEvento(event)
  const linea = typeof event.data?.linea === 'string' ? event.data.linea : undefined

  return (
    <div
      className="h-full min-w-0 rounded-md border-l-[3px] px-1.5 py-0.5 text-left leading-tight"
      style={{
        backgroundColor: event.backgroundColor,
        color: event.color,
        borderLeftColor: linea ?? 'transparent',
      }}
    >
      <div className={`truncate text-[12.5px] font-semibold ${tachado ? 'line-through' : ''}`}>
        {titulo}
      </div>
      <div className="truncate text-[11px] opacity-80">{detalle}</div>
    </div>
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
              <span className="text-xs text-sage-500">
                {formatearHora(turno.fechaHora)} – {formatearHora(turno.fechaHoraFin)} hs
              </span>
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
              {formatearFecha(turno.fechaHora)} · {formatearHora(turno.fechaHora)}–
              {formatearHora(turno.fechaHoraFin)} hs
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
