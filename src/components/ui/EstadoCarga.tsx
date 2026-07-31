import type { ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { Alert } from './Alert'

/** Filas fantasma mientras carga un listado. */
export function Skeleton({ filas = 4 }: { filas?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="h-16 animate-om-skeleton rounded-2xl border border-sand-200 bg-sand-50" />
      ))}
    </div>
  )
}

/** Estado vacío de un listado. */
export function SinResultados({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-14 text-center">
      <div className="text-sm font-medium">{titulo}</div>
      {detalle && <div className="text-[13px] text-sand-700">{detalle}</div>}
    </div>
  )
}

/** Error de carga de una pantalla, con el mensaje que redactó el backend. */
export function ErrorDeCarga({ error, children }: { error: Error; children?: ReactNode }) {
  const mensaje =
    error instanceof ApiError
      ? error.message
      : 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'

  return (
    <Alert>
      {mensaje}
      {children}
    </Alert>
  )
}
