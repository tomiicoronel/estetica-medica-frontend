import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { eliminarFoto, listarDiasConFotos, listarFotosPagina } from '../../api/endpoints/fotos'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { FotoAutenticada } from '../../components/ui/FotoAutenticada'
import { Toast } from '../../components/ui/Toast'
import { VisorFoto } from '../../components/ui/VisorFoto'
import { formatearFecha } from '../../lib/fecha'
import { cargado, oGuion } from '../../lib/formato'
import type { UUID } from '../../types/api'
import { SubirFotoModal } from '../fotos/SubirFotoModal'

const POR_PAGINA = 8

/**
 * Pestaña "Fotos de evolución": se elige un día y se ven sus fotos paginadas,
 * que es la vista de dos niveles que recomienda la guía para no traer todo el
 * historial de imágenes de una.
 */
export function FotosDelPaciente({ pacienteId }: { pacienteId: UUID }) {
  const [dia, setDia] = useState<string | null>(null)
  const [pagina, setPagina] = useState(0)
  const [subiendo, setSubiendo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  /** Índice de la foto ampliada dentro de la página visible, o null. */
  const [ampliada, setAmpliada] = useState<number | null>(null)

  const dias = useQuery({
    queryKey: ['fotos', 'por-dia', pacienteId],
    queryFn: () => listarDiasConFotos(pacienteId),
  })

  useEffect(() => {
    if (dia === null && dias.data && dias.data.length > 0) setDia(dias.data[0].fecha)
  }, [dias.data, dia])

  const page = useQuery({
    queryKey: ['fotos', 'pagina', pacienteId, { dia, pagina }],
    queryFn: () =>
      listarFotosPagina(pacienteId, { page: pagina, size: POR_PAGINA, fecha: dia ?? undefined }),
    enabled: dia !== null,
    placeholderData: (previa) => previa,
  })

  const queryClient = useQueryClient()

  const borrar = useMutation({
    mutationFn: (fotoId: UUID) => eliminarFoto(fotoId),
    onSuccess: async () => {
      // Cierro el visor: la foto que estaba mirando pudo ser la borrada, y el
      // índice de la grilla se corre al recargar la página.
      setAmpliada(null)
      await queryClient.invalidateQueries({ queryKey: ['fotos'] })
      setAviso('Foto eliminada.')
    },
    onError: (e: Error) => {
      setAviso(e instanceof ApiError ? e.message : 'No pudimos eliminar la foto.')
    },
  })

  function elegirDia(fecha: string) {
    setDia(fecha)
    irAPagina(0)
  }

  function irAPagina(numero: number) {
    setPagina(numero)
    // El índice ampliado apunta a la página visible: al cambiarla ya no vale.
    setAmpliada(null)
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-3">
        {dias.data && dias.data.length > 0 && (
          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-control border border-sand-200 bg-sand-50 p-1">
            {dias.data.map((d) => (
              <button
                key={d.fecha}
                type="button"
                onClick={() => elegirDia(d.fecha)}
                aria-pressed={d.fecha === dia}
                className={`flex-none whitespace-nowrap rounded-[9px] px-[13px] py-2.5 text-[12.5px] font-semibold transition-colors app:py-1.5 ${
                  d.fecha === dia ? 'bg-sage-600 text-white' : 'text-sand-700 hover:bg-sage-50'
                }`}
              >
                {formatearFecha(d.fecha)} · {d.cantidadFotos}
              </button>
            ))}
          </div>
        )}

        <Button className="ml-auto" onClick={() => setSubiendo(true)}>
          Subir foto
        </Button>
      </div>

      {dias.isPending && <Skeleton filas={2} />}
      {dias.error && <ErrorDeCarga error={dias.error} />}
      {page.error && <ErrorDeCarga error={page.error} />}

      {dias.data && dias.data.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-13 text-center">
          <div className="text-sm font-medium">
            Todavía no hay fotos de evolución para este paciente
          </div>
          <div className="text-[13px] text-sand-700">
            Se suben desde una sesión clínica ya registrada.
          </div>
        </div>
      )}

      {page.data && page.data.contenido.length > 0 && (
        <div className="flex flex-col gap-[14px] rounded-2xl border border-sand-200 bg-sand-50 p-[22px]">
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-[14.5px] font-semibold">{dia ? formatearFecha(dia) : ''}</h3>
            <span className="text-[12.5px] text-sand-700">
              {page.data.totalElementos} foto{page.data.totalElementos === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 app:grid-cols-4 app:gap-3">
            {page.data.contenido.map((foto, indice) => (
              <div key={foto.id} className="flex flex-col gap-[7px]">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-sand-200">
                  <button
                    type="button"
                    onClick={() => setAmpliada(indice)}
                    title="Ampliar foto"
                    className="block size-full cursor-zoom-in"
                  >
                    <FotoAutenticada
                      fotoId={foto.id}
                      alt={cargado(foto.descripcion) ? foto.descripcion : 'Foto de evolución'}
                      className="size-full"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar.mutate(foto.id)}
                    disabled={borrar.isPending}
                    aria-label="Eliminar foto"
                    title="Eliminar foto"
                    className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-[9px] border border-sand-300 bg-white/90 text-[13px] text-clay-500 transition-colors hover:bg-clay-100"
                  >
                    ✕
                  </button>
                </div>
                <span className="text-xs text-sand-700">{oGuion(foto.descripcion)}</span>
              </div>
            ))}
          </div>

          {page.data.totalPaginas > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-sand-700">
                Página {page.data.pagina + 1} de {page.data.totalPaginas}
              </span>
              <span className="ml-auto flex gap-2">
                <BotonPagina
                  onClick={() => irAPagina(pagina - 1)}
                  habilitado={!page.data.primera}
                  etiqueta="Anterior"
                />
                <BotonPagina
                  onClick={() => irAPagina(pagina + 1)}
                  habilitado={!page.data.ultima}
                  etiqueta="Siguiente"
                />
              </span>
            </div>
          )}
        </div>
      )}

      {ampliada !== null && page.data && ampliada < page.data.contenido.length && (
        <VisorFoto
          fotos={page.data.contenido}
          indice={ampliada}
          onIndice={setAmpliada}
          onCerrar={() => setAmpliada(null)}
        />
      )}

      {subiendo && (
        <SubirFotoModal
          pacienteId={pacienteId}
          onCerrar={() => setSubiendo(false)}
          onListo={(mensaje) => {
            setSubiendo(false)
            setAviso(mensaje)
          }}
        />
      )}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
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
