import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarPacientes } from '../../api/endpoints/pacientes'
import { listarPagos, listarPagosPagina, listarPagosPorDia } from '../../api/endpoints/pagos'
import { listarTurnos } from '../../api/endpoints/turnos'
import { PageHeader } from '../../components/PageHeader'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { formatearFecha } from '../../lib/fecha'
import {
  ETIQUETA_METODO,
  aFechaISO,
  formatearHora,
  formatearMonto,
  oGuion,
} from '../../lib/formato'
import type { PagoResponse, TurnoResponse } from '../../types/api'

const POR_PAGINA = 10

export function PagosPage() {
  const [dia, setDia] = useState<string | null>(null)
  const [pagina, setPagina] = useState(0)

  const dias = useQuery({ queryKey: ['pagos', 'por-dia'], queryFn: listarPagosPorDia })

  // El día seleccionado arranca en el más reciente que tenga pagos.
  useEffect(() => {
    if (dia === null && dias.data && dias.data.length > 0) setDia(dias.data[0].fecha)
  }, [dias.data, dia])

  const page = useQuery({
    queryKey: ['pagos', 'pagina', { dia, pagina }],
    queryFn: () => listarPagosPagina({ page: pagina, size: POR_PAGINA, fecha: dia ?? undefined }),
    enabled: dia !== null,
    placeholderData: (previa) => previa,
  })

  const turnos = useQuery({ queryKey: ['turnos', 'todos'], queryFn: listarTurnos })
  const pacientes = useQuery({ queryKey: ['pacientes'], queryFn: listarPacientes })
  const historico = useQuery({ queryKey: ['pagos', 'historico'], queryFn: listarPagos })

  const turnoPorId = useMemo(() => {
    const mapa = new Map<string, TurnoResponse>()
    for (const t of turnos.data ?? []) mapa.set(t.id, t)
    return mapa
  }, [turnos.data])

  const nombrePorPaciente = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of pacientes.data ?? []) mapa.set(p.id, `${p.nombre} ${p.apellido}`)
    return mapa
  }, [pacientes.data])

  /**
   * Deuda global. No hay endpoint de deudores, pero sale exacta cruzando dos
   * listados: por cada turno no cancelado, su monto menos lo que se le pagó.
   * Sumar totales sueltos no serviría, porque un pago de un turno cancelado
   * descontaría de una deuda que ya no existe.
   */
  const deudaTotal = useMemo(() => {
    if (!turnos.data || !historico.data) return undefined

    const pagadoPorTurno = new Map<string, number>()
    for (const pago of historico.data) {
      pagadoPorTurno.set(pago.turnoId, (pagadoPorTurno.get(pago.turnoId) ?? 0) + pago.monto)
    }

    return turnos.data
      .filter((turno) => turno.estado !== 'CANCELADO')
      .reduce(
        (suma, turno) =>
          suma + Math.max(0, turno.montoTotal - (pagadoPorTurno.get(turno.id) ?? 0)),
        0,
      )
  }, [turnos.data, historico.data])

  const totalHistorico = useMemo(
    () => historico.data?.reduce((suma, pago) => suma + pago.monto, 0),
    [historico.data],
  )

  // `aFechaISO` da el día local; `toISOString()` daría el UTC y en Argentina
  // (UTC-3) después de las 21 hs ya sería el día siguiente.
  const hoy = aFechaISO(new Date())
  const recaudadoHoy = dias.data?.find((d) => d.fecha === hoy)?.totalRecaudado ?? 0

  const diaElegido = dias.data?.find((d) => d.fecha === dia)

  function elegirDia(fecha: string) {
    setDia(fecha)
    setPagina(0)
  }

  function nombreDe(pago: PagoResponse): string {
    const turno = turnoPorId.get(pago.turnoId)
    if (!turno) return 'Paciente'
    return nombrePorPaciente.get(turno.pacienteId) ?? 'Paciente'
  }

  function detalleDe(pago: PagoResponse): string {
    const turno = turnoPorId.get(pago.turnoId)
    if (!turno) return '—'
    const servicios = turno.servicios.map((s) => s.nombre).join(' · ')
    return `${formatearFecha(turno.fechaHora)} · ${servicios || 'Sin servicios'}`
  }

  return (
    <>
      <PageHeader titulo="Pagos y deuda" subtitulo="Lo cobrado y lo que falta cobrar." />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:gap-[22px] app:px-[34px] app:pb-15 app:pt-7">
        <div className="grid gap-2.5 app:grid-cols-3 app:gap-[14px]">
          <Stat label="Recaudado hoy" valor={dias.data ? formatearMonto(recaudadoHoy) : '—'} />
          <Stat
            label="Total histórico"
            valor={totalHistorico === undefined ? '—' : formatearMonto(totalHistorico)}
          />
          <Stat
            label="Deuda pendiente"
            valor={deudaTotal === undefined ? '—' : formatearMonto(deudaTotal)}
            alerta={deudaTotal !== undefined && deudaTotal > 0}
          />
        </div>

        {dias.error && <ErrorDeCarga error={dias.error} />}
        {dias.isPending && <Skeleton filas={4} />}

        {dias.data && (
          <div className="flex flex-col gap-[14px] app:grid app:grid-cols-[340px_1fr] app:items-start app:gap-4">
            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-sand-50">
              <div className="border-b border-sand-200 px-[18px] py-[15px] text-sm font-semibold">
                Recaudación por día
              </div>

              {dias.data.map((d) => (
                <button
                  key={d.fecha}
                  type="button"
                  onClick={() => elegirDia(d.fecha)}
                  className={`flex w-full items-center gap-3 border-b border-sand-200/60 px-[18px] py-3.5 text-left transition-colors last:border-b-0 ${
                    d.fecha === dia ? 'bg-sage-100' : 'hover:bg-sage-50'
                  }`}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13.5px] font-semibold">{formatearFecha(d.fecha)}</span>
                    <span className="text-xs text-sage-500">
                      {d.cantidadPagos} pago{d.cantidadPagos === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="ml-auto text-sm font-semibold text-sage-800">
                    {formatearMonto(d.totalRecaudado)}
                  </span>
                </button>
              ))}

              {dias.data.length === 0 && (
                <div className="px-[18px] py-11 text-center text-[13px] text-sand-700">
                  Sin pagos registrados.
                </div>
              )}
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-sand-200 bg-sand-50">
              <div className="flex items-center gap-3 border-b border-sand-200 px-5 py-[15px]">
                <span className="text-sm font-semibold">
                  {dia ? formatearFecha(dia) : 'Elegí un día'}
                </span>
                {diaElegido && (
                  <span className="ml-auto text-[13px] text-sand-700">
                    {formatearMonto(diaElegido.totalRecaudado)}
                  </span>
                )}
              </div>

              {page.error && (
                <div className="p-5">
                  <ErrorDeCarga error={page.error} />
                </div>
              )}

              {page.data && <TablaPagos pagos={page.data.contenido} nombreDe={nombreDe} detalleDe={detalleDe} />}
              {page.data && <TarjetasPagos pagos={page.data.contenido} nombreDe={nombreDe} detalleDe={detalleDe} />}

              {page.data && page.data.totalElementos === 0 && (
                <div className="px-5 py-14 text-center text-[13.5px] text-sand-700">
                  No hay pagos registrados en esta fecha.
                </div>
              )}

              {page.data && page.data.totalPaginas > 1 && (
                <div className="flex items-center gap-3 px-5 py-[13px]">
                  <span className="text-[12.5px] text-sand-700">
                    Página {page.data.pagina + 1} de {page.data.totalPaginas}
                  </span>
                  <span className="ml-auto flex gap-2">
                    <BotonPagina
                      onClick={() => setPagina(pagina - 1)}
                      habilitado={!page.data.primera}
                      etiqueta="Anterior"
                    />
                    <BotonPagina
                      onClick={() => setPagina(pagina + 1)}
                      habilitado={!page.data.ultima}
                      etiqueta="Siguiente"
                    />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Stat({ label, valor, alerta = false }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-sand-200 bg-sand-50 p-5">
      <span className="text-[12.5px] text-sand-700">{label}</span>
      <span
        className={`text-[26px] font-semibold tracking-[-0.02em] ${
          alerta ? 'text-clay-500' : 'text-sage-800'
        }`}
      >
        {valor}
      </span>
    </div>
  )
}

interface TablaProps {
  pagos: PagoResponse[]
  nombreDe: (pago: PagoResponse) => string
  detalleDe: (pago: PagoResponse) => string
}

const COLUMNAS = 'grid-cols-[minmax(150px,1.4fr)_minmax(140px,1.2fr)_130px_90px_110px]'

/** Tabla — desde 860px. */
function TablaPagos({ pagos, nombreDe, detalleDe }: TablaProps) {
  if (pagos.length === 0) return null

  return (
    <div className="hidden overflow-x-auto app:block">
      <div className="min-w-[760px]">
        <div
          className={`grid ${COLUMNAS} gap-3.5 border-b border-sand-200 px-5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500`}
        >
          <span>Paciente</span>
          <span>Turno</span>
          <span>Método</span>
          <span>Seña</span>
          <span>Monto</span>
        </div>

        {pagos.map((pago) => (
          <div
            key={pago.id}
            className={`grid ${COLUMNAS} items-center gap-3.5 border-b border-sand-200/60 px-5 py-3.5 last:border-b-0`}
          >
            <span className="truncate text-[13.5px] font-medium">{nombreDe(pago)}</span>
            <span className="truncate text-[13px] text-sand-700">{detalleDe(pago)}</span>
            <BadgeMetodo pago={pago} />
            <span className="text-[13px] text-sand-700">{pago.esSena ? 'Sí' : '—'}</span>
            <span className="text-[13.5px] font-semibold">{formatearMonto(pago.monto)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Tarjetas — por debajo de 860px. */
function TarjetasPagos({ pagos, nombreDe, detalleDe }: TablaProps) {
  if (pagos.length === 0) return null

  return (
    <div className="flex flex-col app:hidden">
      {pagos.map((pago) => (
        <div
          key={pago.id}
          className="flex flex-col gap-2 border-b border-sand-200/60 px-4 py-3.5 last:border-b-0"
        >
          <div className="flex items-center gap-2.5">
            <span className="min-w-0 truncate text-sm font-semibold">{nombreDe(pago)}</span>
            <span className="ml-auto text-sm font-semibold text-sage-800">
              {formatearMonto(pago.monto)}
            </span>
          </div>
          <div className="text-[12.5px] text-sand-700">{detalleDe(pago)}</div>
          <div className="flex items-center gap-2">
            <BadgeMetodo pago={pago} />
            {pago.esSena && (
              <span className="rounded-full bg-sand-200 px-2 py-0.5 text-[10.5px] font-semibold text-sand-700">
                Seña
              </span>
            )}
            <span className="ml-auto text-[12px] text-sage-500">
              {formatearHora(pago.fecha)} hs
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** paleta.md define un color por método de pago. */
const ESTILO_METODO: Record<string, string> = {
  EFECTIVO: 'bg-emerald-100 text-emerald-800',
  TRANSFERENCIA: 'bg-sky-100 text-sky-800',
  MERCADO_PAGO: 'bg-indigo-100 text-indigo-800',
  TRUEQUE: 'bg-amber-100 text-amber-800',
}

function BadgeMetodo({ pago }: { pago: PagoResponse }) {
  return (
    <span
      title={pago.esTrueque ? oGuion(pago.detalleTrueque) : undefined}
      className={`inline-flex w-fit items-center justify-self-start rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ESTILO_METODO[pago.metodo]}`}
    >
      {ETIQUETA_METODO[pago.metodo]}
    </span>
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
