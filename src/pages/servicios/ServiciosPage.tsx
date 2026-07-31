import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { cambiarEstadoServicio, listarServicios } from '../../api/endpoints/servicios'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Toast } from '../../components/ui/Toast'
import { formatearMonto, oGuion } from '../../lib/formato'
import type { ServicioResponse } from '../../types/api'
import { ServicioFormModal } from './ServicioFormModal'

type Modal = { tipo: 'crear' } | { tipo: 'editar'; servicio: ServicioResponse }

export function ServiciosPage() {
  const [modal, setModal] = useState<Modal | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: servicios, isPending, error } = useQuery({
    queryKey: ['servicios'],
    queryFn: listarServicios,
  })

  const estado = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      cambiarEstadoServicio(id, activo),
    onSuccess: async (_texto, { activo }) => {
      await queryClient.invalidateQueries({ queryKey: ['servicios'] })
      setAviso(activo ? 'Servicio activado.' : 'Servicio desactivado.')
    },
    onError: (e: Error) => {
      setAviso(e instanceof ApiError ? e.message : 'No pudimos cambiar el estado.')
    },
  })

  return (
    <>
      <PageHeader
        titulo="Servicios"
        subtitulo="Tus prestaciones y sus precios."
        accion={<Button onClick={() => setModal({ tipo: 'crear' })}>Nuevo servicio</Button>}
      />

      <div className="flex w-full max-w-[1420px] flex-col gap-4 px-4 pb-25 pt-4 app:gap-[22px] app:px-[34px] app:pb-15 app:pt-7">
        {isPending && <Skeleton filas={3} />}
        {error && <ErrorDeCarga error={error} />}

        {servicios && servicios.length > 0 && (
          <div className="grid gap-2.5 app:grid-cols-3 app:gap-[14px]">
            {servicios.map((servicio) => (
              <Tarjeta
                key={servicio.id}
                servicio={servicio}
                onEditar={() => setModal({ tipo: 'editar', servicio })}
                onAlternar={() =>
                  estado.mutate({ id: servicio.id, activo: !servicio.activo })
                }
                alternando={estado.isPending}
              />
            ))}
          </div>
        )}

        {servicios && servicios.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-14 text-center">
            <div className="text-sm font-medium">Todavía no cargaste servicios</div>
            <div className="text-[13px] text-sand-700">
              Definí tus prestaciones y precios para poder agendar turnos.
            </div>
            <Button className="mt-1.5" onClick={() => setModal({ tipo: 'crear' })}>
              Nuevo servicio
            </Button>
          </div>
        )}
      </div>

      {modal?.tipo === 'crear' && (
        <ServicioFormModal
          onCerrar={() => setModal(null)}
          onListo={(mensaje) => {
            setModal(null)
            setAviso(mensaje)
          }}
        />
      )}
      {modal?.tipo === 'editar' && (
        <ServicioFormModal
          servicio={modal.servicio}
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

function Tarjeta({
  servicio,
  onEditar,
  onAlternar,
  alternando,
}: {
  servicio: ServicioResponse
  onEditar: () => void
  onAlternar: () => void
  alternando: boolean
}) {
  const boton =
    'min-h-[38px] rounded-[10px] border border-sand-300 bg-white px-[13px] text-[12.5px] font-semibold text-sage-700 transition-colors hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div
      className={`flex min-h-[190px] flex-col gap-[11px] rounded-2xl border border-sand-200 bg-sand-50 p-5 ${
        servicio.activo ? '' : 'opacity-70'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{servicio.nombre}</h3>
        <span
          className={`ml-auto inline-flex flex-none items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            servicio.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-sand-200 text-sand-700'
          }`}
        >
          {servicio.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <p className="text-[13px] leading-[1.55] text-sand-700">
        {oGuion(servicio.descripcion)}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-[9px] border-t border-sand-200 pt-3.5">
        <span className="mr-auto text-[19px] font-semibold tracking-[-0.02em] text-sage-800">
          {formatearMonto(servicio.precio)}
        </span>
        <button type="button" onClick={onEditar} className={boton}>
          Editar
        </button>
        <button type="button" onClick={onAlternar} disabled={alternando} className={boton}>
          {servicio.activo ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </div>
  )
}
