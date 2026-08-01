import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { listarTurnosDePaciente } from '../../api/endpoints/turnos'
import { listarPagosDeTurno } from '../../api/endpoints/pagos'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { formatearFecha } from '../../lib/fecha'
import { ETIQUETA_METODO, formatearMonto } from '../../lib/formato'
import type { PagoResponse, TurnoResponse, UUID } from '../../types/api'

/**
 * Pestaña "Pagos" de la ficha.
 *
 * No hay un endpoint de pagos por paciente: se piden los pagos de cada turno
 * suyo. Son los turnos de una sola persona, así que el fan-out es acotado.
 */
export function PagosDelPaciente({ pacienteId }: { pacienteId: UUID }) {
  const turnos = useQuery({
    queryKey: ['turnos', 'paciente', pacienteId],
    queryFn: () => listarTurnosDePaciente(pacienteId),
  })

  const relevantes = useMemo(
    () => (turnos.data ?? []).filter((t) => t.estado !== 'CANCELADO'),
    [turnos.data],
  )

  const consultas = useQueries({
    queries: relevantes.map((turno) => ({
      queryKey: ['pagos', 'turno', turno.id],
      queryFn: () => listarPagosDeTurno(turno.id),
    })),
  })

  const cargando = turnos.isPending || consultas.some((c) => c.isPending)

  const filas = useMemo(() => {
    const items: { pago: PagoResponse; turno: TurnoResponse }[] = []
    consultas.forEach((consulta, i) => {
      for (const pago of consulta.data ?? []) items.push({ pago, turno: relevantes[i] })
    })
    return items.sort((a, b) => b.pago.fecha.localeCompare(a.pago.fecha))
  }, [consultas, relevantes])

  const facturado = relevantes.reduce((suma, t) => suma + t.montoTotal, 0)
  const pagado = filas.reduce((suma, f) => suma + f.pago.monto, 0)
  const deuda = Math.max(0, facturado - pagado)

  if (turnos.error) return <ErrorDeCarga error={turnos.error} />
  if (cargando) return <Skeleton filas={3} />

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="grid gap-2.5 app:grid-cols-3 app:gap-[14px]">
        <Stat label="Facturado" valor={formatearMonto(facturado)} />
        <Stat label="Pagado" valor={formatearMonto(pagado)} />
        <Stat label="Deuda" valor={formatearMonto(deuda)} alerta={deuda > 0} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-sand-200 bg-sand-50">
        {filas.map(({ pago, turno }) => (
          <div
            key={pago.id}
            className="grid grid-cols-[110px_1fr_auto_auto] items-center gap-4 border-b border-sand-200/60 px-5 py-[15px] last:border-b-0"
          >
            <span className="text-[13.5px] text-sage-700">{formatearFecha(pago.fecha)}</span>
            <span className="min-w-0 truncate text-[13.5px] text-sand-700">
              {formatearFecha(turno.fechaHora)} ·{' '}
              {turno.servicios.map((s) => s.nombre).join(' · ') || 'Sin servicios'}
            </span>
            <span className="text-[12.5px] text-sand-700">
              {ETIQUETA_METODO[pago.metodo]}
              {pago.esSena ? ' · seña' : ''}
            </span>
            <span className="text-sm font-semibold text-sage-800">
              {formatearMonto(pago.monto)}
            </span>
          </div>
        ))}

        {filas.length === 0 && (
          <div className="px-5 py-13 text-center text-[13.5px] text-sand-700">
            No hay pagos registrados para este paciente.
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, valor, alerta = false }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex flex-col gap-[7px] rounded-2xl border border-sand-200 bg-sand-50 p-[18px]">
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
