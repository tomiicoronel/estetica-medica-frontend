import { useEffect, useState } from 'react'
import { getContenidoFoto } from '../../api/endpoints/fotos'
import type { UUID } from '../../types/api'

interface Entrada {
  promesa: Promise<string>
  /** Se llena cuando la promesa resuelve; hace falta para poder revocarlo. */
  url: string | null
  refs: number
}

/**
 * Object URLs vivos, con conteo de referencias.
 *
 * La miniatura de la grilla y el visor ampliado muestran la misma foto: sin
 * esto la descargaríamos dos veces (y son imágenes de hasta 15 MB). Con el
 * cache, ampliar es instantáneo. El conteo de referencias es lo que permite
 * revocar el URL recién cuando no queda nadie mostrándola.
 */
const cache = new Map<UUID, Entrada>()

function tomar(fotoId: UUID): Entrada {
  const existente = cache.get(fotoId)
  if (existente) {
    existente.refs += 1
    return existente
  }

  const entrada: Entrada = { url: null, refs: 1, promesa: Promise.resolve('') }
  entrada.promesa = getContenidoFoto(fotoId).then((blob) => {
    entrada.url = URL.createObjectURL(blob)
    return entrada.url
  })
  cache.set(fotoId, entrada)
  return entrada
}

function soltar(fotoId: UUID, entrada: Entrada) {
  entrada.refs -= 1
  if (entrada.refs > 0) return

  cache.delete(fotoId)
  // Puede seguir en vuelo: hay que esperar el URL para poder revocarlo.
  entrada.promesa
    .then(() => {
      if (entrada.url !== null) URL.revokeObjectURL(entrada.url)
    })
    .catch(() => {})
}

/**
 * URL local de una foto de evolución.
 *
 * `GET /api/fotos/{id}/contenido` exige el header Authorization, así que un
 * `<img src>` directo al endpoint devuelve 401: hay que bajar el blob.
 */
export function useFotoUrl(fotoId: UUID): { url: string | null; fallo: boolean } {
  const [url, setUrl] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    // La descarga es asíncrona: si el componente se desmonta antes, no hay que
    // tocar el estado.
    let vivo = true
    const entrada = tomar(fotoId)

    setUrl(null)
    setFallo(false)

    entrada.promesa
      .then((objectUrl) => {
        if (vivo) setUrl(objectUrl)
      })
      .catch(() => {
        if (vivo) setFallo(true)
      })

    return () => {
      vivo = false
      soltar(fotoId, entrada)
    }
  }, [fotoId])

  return { url, fallo }
}
