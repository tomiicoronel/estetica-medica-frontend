import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { getDashboard, getResumenDiarioPagos } from '../../api/endpoints/dashboard'
import { listarPacientes } from '../../api/endpoints/pacientes'
import { getResumenPagosTurno, getTurnosProximos } from '../../api/endpoints/turnos'
import { PageHeader } from '../../components/PageHeader'
import { BadgeEstadoTurno } from '../../components/ui/Badge'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import {
  ETIQUETA_METODO,
  aFechaISO,
  formatearFechaLarga,
  formatearHora,
  formatearMonto,
} from '../../lib/formato'
import type { MetodoPago, TurnoResponse } from '../../types/api'

export function DashboardPage() {
  const hoy = useMemo(() => new Date(), [])
  const fecha = aFechaISO(hoy)

  const dashboard = useQuery({
    queryKey: ['dashboard', fecha],
    queryFn: () => getDashboard(fecha),
  })

  const turnosHoy = useQuery({
    queryKey: ['turnos', 'proximos', fecha],
    queryFn: () => getTurnosProximos(fecha),
  })

  const pagosHoy = useQuery({
    queryKey: ['pagos', 'resumen-diario', fecha],
    queryFn: () => getResumenDiarioPagos(fecha),
  })

  // TurnoResponse solo trae pacienteId; el nombre sale de acá.
  const pacientes = useQuery({ queryKey: ['pacientes'], queryFn: listarPacientes })

  const nombrePorPaciente = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of pacientes.data ?? []) mapa.set(p.id, `${p.nombre} ${p.apellido}`)
    return mapa
  }, [pacientes.data])

  return (
    <>
      <PageHeader titulo="Inicio" subtitulo={formatearFechaLarga(hoy)} />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:gap-[22px] app:px-[34px] app:pb-15 app:pt-7">
        {dashboard.error && <ErrorDeCarga error={dashboard.error} />}

        {dashboard.isPending ? (
          <Skeleton filas={2} />
        ) : (
          dashboard.data && (
            <div className="grid grid-cols-2 gap-2.5 app:grid-cols-4 app:gap-[14px]">
              <Stat
                label="Turnos de hoy"
                valor={String(dashboard.data.cantidadTurnos)}
                nota="Agendados para la fecha"
              />
              <Stat
                label="Realizados"
                valor={String(dashboard.data.cantidadTurnosRealizados)}
                nota="De los turnos de hoy"
              />
              <Stat
                label="Pacientes activos"
                valor={String(dashboard.data.pacientesActivos)}
                nota="Total, no depende del día"
              />
              <Stat
                label="Recaudado hoy"
                valor={formatearMonto(dashboard.data.totalRecaudado)}
                nota="Pagos registrados hoy"
              />
            </div>
          )
        )}

        <div className="flex flex-col gap-[14px] app:grid app:grid-cols-[1.55fr_1fr] app:items-start app:gap-[18px]">
          <TurnosDeHoy
            turnos={turnosHoy.data}
            cargando={turnosHoy.isPending}
            error={turnosHoy.error}
            nombrePorPaciente={nombrePorPaciente}
            fechaLarga={formatearFechaLarga(hoy)}
          />

          <div className="flex flex-col gap-[18px]">
            <Recaudacion
              total={dashboard.data?.totalRecaudado}
              pagos={pagosHoy.data?.pagos}
              cargando={pagosHoy.isPending}
            />
            <DeudaDelDia turnos={turnosHoy.data ?? []} nombrePorPaciente={nombrePorPaciente} />
          </div>
        </div>
      </div>
    </>
  )
}

function Stat({ label, valor, nota }: { label: string; valor: string; nota: string }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-sand-200 bg-sand-50 p-5">
      <div className="text-[12.5px] font-medium text-sand-700">{label}</div>
      <div className="text-[30px] font-semibold tracking-[-0.03em] text-sage-900">{valor}</div>
      <div className="text-xs text-sage-500">{nota}</div>
    </div>
  )
}

function Panel({ titulo, extra, children }: { titulo: string; extra?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-sand-50">
      <div className="flex items-center gap-3 border-b border-sand-200 px-5 py-[18px]">
        <h2 className="text-[15px] font-semibold">{titulo}</h2>
        {extra && <span className="ml-auto text-[12.5px] text-sand-700">{extra}</span>}
      </div>
      {children}
    </div>
  )
}

function TurnosDeHoy({
  turnos,
  cargando,
  error,
  nombrePorPaciente,
  fechaLarga,
}: {
  turnos: TurnoResponse[] | undefined
  cargando: boolean
  error: Error | null
  nombrePorPaciente: Map<string, string>
  fechaLarga: string
}) {
  return (
    <Panel titulo="Turnos de hoy" extra={fechaLarga}>
      {error && (
        <div className="p-5">
          <ErrorDeCarga error={error} />
        </div>
      )}

      {cargando && (
        <div className="p-5">
          <Skeleton filas={3} />
        </div>
      )}

      {turnos && turnos.length > 0 && (
        <div className="flex flex-col">
          {turnos.map((turno) => (
            <div
              key={turno.id}
              className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-sand-200/60 px-5 py-[15px] last:border-b-0 app:grid-cols-[66px_1fr_auto_auto] app:gap-4"
            >
              <span className="text-[15px] font-semibold text-sage-800">
                {formatearHora(turno.fechaHora)}
              </span>
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="truncate text-sm font-medium">
                  {nombrePorPaciente.get(turno.pacienteId) ?? 'Paciente'}
                </span>
                <span className="truncate text-[12.5px] text-sand-700">
                  {turno.servicios.map((s) => s.nombre).join(', ')}
                </span>
              </span>
              <BadgeEstadoTurno estado={turno.estado} />
              <span className="col-start-2 text-sm font-semibold text-sage-800 app:col-start-auto app:text-right">
                {formatearMonto(turno.montoTotal)}
              </span>
            </div>
          ))}
        </div>
      )}

      {turnos && turnos.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-5 py-13 text-center">
          <div className="flex size-11 items-center justify-center rounded-[14px] bg-sage-50 text-sage-500">
            ◷
          </div>
          <div className="text-sm font-medium">No hay turnos agendados para hoy</div>
          <div className="text-[13px] text-sand-700">Cuando cargues turnos van a aparecer acá.</div>
        </div>
      )}
    </Panel>
  )
}

function Recaudacion({
  total,
  pagos,
  cargando,
}: {
  total: number | undefined
  pagos: { metodo: MetodoPago; monto: number }[] | undefined
  cargando: boolean
}) {
  // El backend no devuelve el desglose por método: lo agrupamos con los pagos
  // del día que ya trae `resumen-diario`.
  const desglose = useMemo(() => {
    const porMetodo = new Map<MetodoPago, number>()
    for (const pago of pagos ?? []) {
      porMetodo.set(pago.metodo, (porMetodo.get(pago.metodo) ?? 0) + pago.monto)
    }
    return [...porMetodo.entries()]
  }, [pagos])

  return (
    <div className="flex flex-col gap-[14px] rounded-2xl border border-sand-200 bg-sand-50 p-5">
      <h2 className="text-[15px] font-semibold">Recaudación de hoy</h2>
      <div className="text-[32px] font-semibold tracking-[-0.03em] text-sage-800">
        {total === undefined ? '—' : formatearMonto(total)}
      </div>

      <div className="flex flex-col gap-[9px]">
        {desglose.map(([metodo, monto]) => (
          <div key={metodo} className="flex items-center gap-2.5 text-[13px]">
            <span className="text-sand-700">{ETIQUETA_METODO[metodo]}</span>
            <span className="h-px flex-1 bg-sand-200" />
            <span className="font-semibold text-sage-800">{formatearMonto(monto)}</span>
          </div>
        ))}
      </div>

      {!cargando && desglose.length === 0 && (
        <div className="text-[13px] text-sand-700">Todavía no registraste pagos hoy.</div>
      )}
    </div>
  )
}

/**
 * Deuda acotada a los turnos de hoy.
 *
 * El diseño muestra "Deuda pendiente" en general, pero no existe un endpoint
 * de deudores: la deuda se calcula por turno con `/api/turnos/{id}/pagos/resumen`.
 * Recorrer el histórico serían cientos de requests; los turnos del día son un
 * puñado, así que el panel dice exactamente lo que muestra.
 */
function DeudaDelDia({
  turnos,
  nombrePorPaciente,
}: {
  turnos: TurnoResponse[]
  nombrePorPaciente: Map<string, string>
}) {
  const relevantes = turnos.filter((t) => t.estado !== 'CANCELADO')

  const resumenes = useQueries({
    queries: relevantes.map((turno) => ({
      queryKey: ['turnos', turno.id, 'pagos', 'resumen'],
      queryFn: () => getResumenPagosTurno(turno.id),
    })),
  })

  const deudores = resumenes
    .map((consulta, i) => ({ resumen: consulta.data, turno: relevantes[i] }))
    .filter((fila) => fila.resumen?.tieneDeuda)

  const cargando = resumenes.some((c) => c.isPending)

  return (
    <div className="flex flex-col gap-[13px] rounded-2xl border border-sand-200 bg-sand-50 p-5">
      <h2 className="text-[15px] font-semibold">Deuda de los turnos de hoy</h2>

      {deudores.map(({ resumen, turno }) => (
        <div key={turno.id} className="flex items-center gap-2.5">
          <span className="truncate text-[13.5px]">
            {nombrePorPaciente.get(turno.pacienteId) ?? 'Paciente'}
          </span>
          <span className="h-px flex-1 bg-sand-200" />
          <span className="text-[13.5px] font-semibold text-clay-500">
            {formatearMonto(resumen?.deuda ?? 0)}
          </span>
        </div>
      ))}

      {!cargando && deudores.length === 0 && (
        <div className="text-[13px] text-sand-700">No hay deudas en los turnos de hoy.</div>
      )}
    </div>
  )
}
