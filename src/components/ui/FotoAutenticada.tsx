import type { UUID } from '../../types/api'
import { useFotoUrl } from './useFotoUrl'

interface Props {
  fotoId: UUID
  alt: string
  className?: string
}

/**
 * Miniatura de una foto de evolución: recorta para llenar la celda cuadrada de
 * la grilla. Para verla entera está el visor, que dibuja su propia imagen
 * porque además necesita controlar el zoom.
 */
export function FotoAutenticada({ fotoId, alt, className = '' }: Props) {
  const { url, fallo } = useFotoUrl(fotoId)

  if (fallo) {
    return (
      <div
        className={`flex items-center justify-center bg-sand-100 text-center text-[11.5px] text-sand-700 ${className}`}
      >
        No se pudo cargar
      </div>
    )
  }

  if (url === null) {
    return <div className={`animate-om-skeleton bg-sand-100 ${className}`} aria-label="Cargando" />
  }

  return <img src={url} alt={alt} className={`size-full object-cover ${className}`} />
}
