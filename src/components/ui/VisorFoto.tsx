import { useCallback, useEffect, useRef, useState } from 'react'
import { formatearFecha } from '../../lib/fecha'
import { cargado, formatearHora } from '../../lib/formato'
import type { FotoPacienteResponse } from '../../types/api'
import { useFotoUrl } from './useFotoUrl'

interface Props {
  fotos: FotoPacienteResponse[]
  indice: number
  onIndice: (indice: number) => void
  onCerrar: () => void
}

/** Escala 1 = foto entera dentro de la pantalla. Nunca se achica más que eso. */
const ESCALA_MIN = 1
const ESCALA_MAX = 8
/** Salto de los botones + / − y del doble clic. */
const PASO = 1.6

/**
 * Visor a pantalla completa para ampliar una foto de evolución.
 *
 * No usa `Modal`: ése es un diálogo de formulario, con ancho acotado y fondo
 * claro. Acá la foto tiene que ocupar todo lo que pueda sobre un fondo oscuro,
 * que es lo que deja ver el detalle de la piel.
 *
 * Abre siempre con la foto entera a la vista y desde ahí se amplía a mano: una
 * captura de celular es mucho más alta que ancha y encuadrarla sola daría un
 * recorte distinto en cada pantalla.
 */
export function VisorFoto({ fotos, indice, onIndice, onCerrar }: Props) {
  const foto = fotos[indice]

  const [escala, setEscala] = useState(1)
  const [desplazamiento, setDesplazamiento] = useState({ x: 0, y: 0 })

  const marco = useRef<HTMLDivElement>(null)
  const imagen = useRef<HTMLImageElement>(null)
  /** Última posición del puntero mientras se arrastra, o null. */
  const arrastre = useRef<{ x: number; y: number } | null>(null)

  const { url, fallo } = useFotoUrl(foto?.id ?? '')

  /**
   * Limita el desplazamiento para que no se pueda arrastrar la foto fuera de
   * la pantalla. `offsetWidth/Height` es el tamaño ya ajustado, porque el
   * `transform` no afecta al layout.
   */
  const acotar = useCallback((x: number, y: number, escalaActual: number) => {
    const caja = marco.current
    const img = imagen.current
    if (caja === null || img === null) return { x: 0, y: 0 }

    const maxX = Math.max(0, (img.offsetWidth * escalaActual - caja.clientWidth) / 2)
    const maxY = Math.max(0, (img.offsetHeight * escalaActual - caja.clientHeight) / 2)

    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }, [])

  /**
   * Amplía manteniendo quieto el punto (px, py), medido desde el centro del
   * marco. Sin esto, ampliar con la rueda "escapa" hacia el centro en vez de
   * acercarse a lo que se está mirando.
   */
  const zoomEn = useCallback(
    (destino: number, px = 0, py = 0) => {
      setEscala((previa) => {
        const nueva = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, destino))
        const factor = nueva / previa

        setDesplazamiento((prev) =>
          acotar(px - factor * (px - prev.x), py - factor * (py - prev.y), nueva),
        )

        return nueva
      })
    },
    [acotar],
  )

  const ajustar = useCallback(() => {
    setEscala(1)
    setDesplazamiento({ x: 0, y: 0 })
  }, [])

  const anterior = useCallback(() => {
    onIndice((indice - 1 + fotos.length) % fotos.length)
  }, [indice, fotos.length, onIndice])

  const siguiente = useCallback(() => {
    onIndice((indice + 1) % fotos.length)
  }, [indice, fotos.length, onIndice])

  // Cada foto arranca ajustada: heredar el zoom de la anterior mostraría un
  // recorte al azar de la siguiente.
  useEffect(() => {
    ajustar()
  }, [foto?.id, ajustar])

  useEffect(() => {
    function onKeyDown(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
      else if (evento.key === 'ArrowLeft') anterior()
      else if (evento.key === 'ArrowRight') siguiente()
      else if (evento.key === '+' || evento.key === '=') zoomEn(escala * PASO)
      else if (evento.key === '-') zoomEn(escala / PASO)
      else if (evento.key === '0') ajustar()
    }

    document.addEventListener('keydown', onKeyDown)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowPrevio
    }
  }, [onCerrar, anterior, siguiente, zoomEn, ajustar, escala])

  // La rueda va como listener nativo y no pasivo: React registra `onWheel`
  // como pasivo y ahí `preventDefault` no corre, así que el navegador haría
  // zoom de toda la página en vez de la foto.
  useEffect(() => {
    const caja = marco.current
    if (caja === null) return

    function onWheel(evento: WheelEvent) {
      if (caja === null) return
      evento.preventDefault()

      const rect = caja.getBoundingClientRect()
      zoomEn(
        escala * Math.exp(-evento.deltaY * 0.0018),
        evento.clientX - (rect.left + rect.width / 2),
        evento.clientY - (rect.top + rect.height / 2),
      )
    }

    caja.addEventListener('wheel', onWheel, { passive: false })
    return () => caja.removeEventListener('wheel', onWheel)
  }, [zoomEn, escala])

  if (!foto) return null

  const varias = fotos.length > 1
  const ampliada = escala > 1

  function onPointerDown(evento: React.PointerEvent<HTMLDivElement>) {
    if (!ampliada) return
    evento.currentTarget.setPointerCapture(evento.pointerId)
    arrastre.current = { x: evento.clientX, y: evento.clientY }
  }

  function onPointerMove(evento: React.PointerEvent<HTMLDivElement>) {
    const previo = arrastre.current
    if (previo === null) return

    const dx = evento.clientX - previo.x
    const dy = evento.clientY - previo.y
    arrastre.current = { x: evento.clientX, y: evento.clientY }

    setDesplazamiento((actual) => acotar(actual.x + dx, actual.y + dy, escala))
  }

  function onPointerUp(evento: React.PointerEvent<HTMLDivElement>) {
    arrastre.current = null
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId)
    }
  }

  function onDobleClic(evento: React.MouseEvent<HTMLDivElement>) {
    if (ampliada) {
      ajustar()
      return
    }

    const caja = marco.current
    if (caja === null) return
    const rect = caja.getBoundingClientRect()
    zoomEn(
      PASO * PASO,
      evento.clientX - (rect.left + rect.width / 2),
      evento.clientY - (rect.top + rect.height / 2),
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto de evolución ampliada"
      className="fixed inset-0 z-80 flex animate-om-fade flex-col bg-sage-900/92"
    >
      <div className="flex flex-none flex-wrap items-start gap-3 px-4 pt-4 app:px-6 app:pt-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold text-white">
            {formatearFecha(foto.fecha)} · {formatearHora(foto.fecha)} hs
          </span>
          {varias && (
            <span className="text-[12.5px] text-sand-200">
              Foto {indice + 1} de {fotos.length}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-none items-center gap-1.5">
          <BotonVisor
            etiqueta="Alejar"
            onClick={() => zoomEn(escala / PASO)}
            deshabilitado={escala <= ESCALA_MIN}
          >
            −
          </BotonVisor>

          <button
            type="button"
            onClick={ajustar}
            title="Ajustar a la pantalla (0)"
            className="min-w-16 rounded-[11px] border border-white/25 px-2.5 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/15"
          >
            {Math.round(escala * 100)}%
          </button>

          <BotonVisor
            etiqueta="Acercar"
            onClick={() => zoomEn(escala * PASO)}
            deshabilitado={escala >= ESCALA_MAX}
          >
            +
          </BotonVisor>

          <BotonVisor etiqueta="Cerrar" onClick={onCerrar} autoFocus>
            ✕
          </BotonVisor>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-2 px-2 py-3 app:gap-4 app:px-4">
        {varias && <Flecha direccion="anterior" onClick={anterior} />}

        <div
          ref={marco}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDobleClic}
          // `touch-action: none` sólo con zoom: al tamaño de ajuste conviene
          // dejarle los gestos nativos al navegador.
          style={{ touchAction: ampliada ? 'none' : undefined }}
          className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${
            ampliada ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          }`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {fallo && <span className="text-sm text-sand-200">No se pudo cargar la foto.</span>}

            {!fallo && url === null && (
              <span className="text-sm text-sand-200" aria-live="polite">
                Cargando…
              </span>
            )}

            {url !== null && (
              <img
                ref={imagen}
                src={url}
                alt={cargado(foto.descripcion) ? foto.descripcion : 'Foto de evolución'}
                draggable={false}
                style={{
                  transform: `translate(${desplazamiento.x}px, ${desplazamiento.y}px) scale(${escala})`,
                }}
                className="max-h-full max-w-full select-none object-contain"
              />
            )}
          </div>
        </div>

        {varias && <Flecha direccion="siguiente" onClick={siguiente} />}
      </div>

      <div className="flex flex-none flex-col items-center gap-1 px-4 pb-6 text-center app:pb-7">
        <span className="text-[13px] text-sand-200">
          {cargado(foto.descripcion) ? foto.descripcion : 'Sin descripción'}
        </span>
        <span className="text-[11.5px] text-sand-400">
          Rueda o doble clic para ampliar · arrastrá para moverte
        </span>
      </div>
    </div>
  )
}

function BotonVisor({
  etiqueta,
  onClick,
  deshabilitado = false,
  autoFocus = false,
  children,
}: {
  etiqueta: string
  onClick: () => void
  deshabilitado?: boolean
  autoFocus?: boolean
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={etiqueta}
      autoFocus={autoFocus}
      className="flex size-10 flex-none items-center justify-center rounded-[11px] border border-white/25 text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

function Flecha({
  direccion,
  onClick,
}: {
  direccion: 'anterior' | 'siguiente'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direccion === 'anterior' ? 'Foto anterior' : 'Foto siguiente'}
      className="flex size-11 flex-none self-center items-center justify-center rounded-full border border-white/25 text-lg text-white transition-colors hover:bg-white/15"
    >
      {direccion === 'anterior' ? '‹' : '›'}
    </button>
  )
}
