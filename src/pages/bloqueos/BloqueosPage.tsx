import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { eliminarBloqueo, listarBloqueos } from '../../api/endpoints/bloqueos'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha } from '../../lib/fecha'
import { formatearHora } from '../../lib/formato'
import type { BloqueoAgendaResponse } from '../../types/api'
import { BloqueoFormModal } from './BloqueoFormModal'

type Modal = { tipo: 'crear' } | { tipo: 'editar'; bloqueo: BloqueoAgendaResponse }

export function BloqueosPage() {
  const [modal, setModal] = useState<Modal | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data, isPending, error } = useQuery({
    queryKey: ['bloqueos'],
    queryFn: listarBloqueos,
  })

  // El endpoint no garantiza orden: el más próximo primero es lo útil acá.
  const bloqueos = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
    [data],
  )

  const borrar = useMutation({
    mutationFn: (id: string) => eliminarBloqueo(id),
    onSuccess: async () => {
      setConfirmando(null)
      await queryClient.invalidateQueries({ queryKey: ['bloqueos'] })
      setAviso('Bloqueo eliminado.')
    },
    onError: (e: Error) => {
      setAviso(e instanceof ApiError ? e.message : 'No pudimos eliminar el bloqueo.')
    },
  })

  return (
    <>
      <PageHeader
        titulo="Bloqueos de agenda"
        subtitulo="Rangos en los que no atendés."
        accion={<Button onClick={() => setModal({ tipo: 'crear' })}>Bloquear horario</Button>}
      />

      <div className="flex w-full max-w-[1420px] flex-col gap-3.5 px-4 pb-25 pt-4 app:px-[34px] app:pb-15 app:pt-7">
        {isPending && <Skeleton filas={3} />}
        {error && <ErrorDeCarga error={error} />}

        {bloqueos.map((bloqueo) => (
          <div
            key={bloqueo.id}
            className="flex flex-wrap items-center gap-[18px] rounded-2xl border border-sand-200 bg-sand-50 p-5"
          >
            <div className="size-11 flex-none rounded-control bg-[repeating-linear-gradient(135deg,var(--color-sand-100),var(--color-sand-100)_5px,var(--color-sand-200)_5px,var(--color-sand-200)_10px)]" />

            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[14.5px] font-semibold">
                {bloqueo.motivo ?? 'Sin motivo'}
              </span>
              <span className="text-[13px] text-sand-700">{rango(bloqueo)}</span>
            </div>

            <div className="flex flex-wrap gap-[9px] app:ml-auto">
              <button
                type="button"
                onClick={() => setModal({ tipo: 'editar', bloqueo })}
                className="min-h-11 rounded-[10px] border border-sand-300 bg-white px-3.5 text-[13px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 app:min-h-[38px]"
              >
                Editar
              </button>

              {confirmando === bloqueo.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmando(null)}
                    className="min-h-11 rounded-[10px] border border-sand-300 bg-white px-3.5 text-[13px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 app:min-h-[38px]"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar.mutate(bloqueo.id)}
                    disabled={borrar.isPending}
                    className="min-h-11 rounded-[10px] border border-clay-400 bg-clay-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 app:min-h-[38px]"
                  >
                    Sí, eliminar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmando(bloqueo.id)}
                  className="min-h-11 rounded-[10px] border border-clay-400 bg-white px-3.5 text-[13px] font-semibold text-clay-500 transition-colors hover:bg-clay-100 app:min-h-[38px]"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}

        {data && bloqueos.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-14 text-center">
            <div className="text-sm font-medium">No tenés bloqueos cargados</div>
            <div className="text-[13px] text-sand-700">
              Bloqueá los rangos en los que no atendés para evitar turnos superpuestos.
            </div>
            <Button className="mt-1.5" onClick={() => setModal({ tipo: 'crear' })}>
              Bloquear horario
            </Button>
          </div>
        )}
      </div>

      {modal !== null && (
        <BloqueoFormModal
          bloqueo={modal.tipo === 'editar' ? modal.bloqueo : undefined}
          onCerrar={() => setModal(null)}
          onListo={(mensaje) => {
            setModal(null)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </>
  )
}

/** "12/08/2026, 09:00 a 13:00 hs" si es el mismo día; con las dos fechas si no. */
function rango(bloqueo: BloqueoAgendaResponse): string {
  const desde = `${formatearFecha(bloqueo.fechaInicio)}, ${formatearHora(bloqueo.fechaInicio)}`
  const mismoDia = bloqueo.fechaInicio.slice(0, 10) === bloqueo.fechaFin.slice(0, 10)

  const hasta = mismoDia
    ? formatearHora(bloqueo.fechaFin)
    : `${formatearFecha(bloqueo.fechaFin)}, ${formatearHora(bloqueo.fechaFin)}`

  return `${desde} a ${hasta} hs`
}
