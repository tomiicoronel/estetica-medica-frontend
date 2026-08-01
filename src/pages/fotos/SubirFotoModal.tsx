import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { subirFoto } from '../../api/endpoints/fotos'
import { listarSesionesDePaciente } from '../../api/endpoints/sesiones'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { formatearFecha } from '../../lib/fecha'
import type { UUID } from '../../types/api'

interface Props {
  pacienteId: UUID
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/** Límites del backend: 15 MB y estos tipos. */
const MAX_BYTES = 15 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export function SubirFotoModal({ pacienteId, onCerrar, onListo }: Props) {
  const [sesionId, setSesionId] = useState<UUID>('')
  const [descripcion, setDescripcion] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  // La foto cuelga de una sesión clínica, no del paciente: sin sesiones no hay
  // dónde guardarla.
  const sesiones = useQuery({
    queryKey: ['sesiones', 'paciente', pacienteId],
    queryFn: () => listarSesionesDePaciente(pacienteId),
  })

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: (archivo: File) => subirFoto(sesionId, archivo, descripcion.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fotos'] })
      onListo('Foto subida.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    if (sesionId === '') {
      setErrorLocal('Elegí a qué sesión pertenece la foto.')
      return
    }

    const archivo = archivoRef.current?.files?.[0]
    if (!archivo) {
      setErrorLocal('Elegí una imagen.')
      return
    }
    if (!TIPOS.includes(archivo.type)) {
      setErrorLocal('El formato no está permitido. Se aceptan JPG, PNG, WEBP y HEIC.')
      return
    }
    if (archivo.size > MAX_BYTES) {
      setErrorLocal('La imagen supera los 15 MB.')
      return
    }

    mutacion.mutate(archivo)
  }

  const error = mutacion.error
  const sinSesiones = sesiones.data !== undefined && sesiones.data.length === 0

  return (
    <Modal
      titulo="Subir foto de evolución"
      subtitulo="Cada foto queda asociada a una sesión clínica."
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-foto"
            cargando={mutacion.isPending}
            disabled={sinSesiones}
          >
            Subir foto
          </Button>
        </>
      }
    >
      <form id="form-foto" onSubmit={onSubmit} className="flex flex-col gap-[15px]">
        {sinSesiones && (
          <Alert>
            Este paciente todavía no tiene sesiones clínicas. Registrá una desde un turno
            realizado para poder subir fotos.
          </Alert>
        )}

        <div className="flex flex-col gap-[7px]">
          <label htmlFor="foto-sesion" className="text-[13px] font-medium text-sage-800">
            Sesión<span className="ml-1 text-clay-500">*</span>
          </label>
          <select
            id="foto-sesion"
            value={sesionId}
            onChange={(e) => setSesionId(e.target.value)}
            disabled={sinSesiones}
            className="w-full rounded-control border border-sand-300 bg-white px-[13px] py-[11px] text-sm disabled:opacity-60"
          >
            <option value="">Elegí una sesión</option>
            {(sesiones.data ?? []).map((sesion) => (
              <option key={sesion.id} value={sesion.id}>
                Sesión {sesion.numeroSesion} · {formatearFecha(sesion.creadoEn)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-[7px]">
          <label htmlFor="foto-archivo" className="text-[13px] font-medium text-sage-800">
            Imagen<span className="ml-1 text-clay-500">*</span>
          </label>
          <input
            id="foto-archivo"
            ref={archivoRef}
            type="file"
            accept={TIPOS.join(',')}
            disabled={sinSesiones}
            className="w-full rounded-control border border-sand-300 bg-white px-[13px] py-[10px] text-sm file:mr-3 file:rounded-[9px] file:border-0 file:bg-sage-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-sage-800"
          />
          <span className="text-xs text-sand-700">JPG, PNG, WEBP o HEIC. Hasta 15 MB.</span>
        </div>

        <Input
          label="Descripción"
          superficie="blanco"
          placeholder="Opcional"
          disabled={sinSesiones}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        {errorLocal && <Alert>{errorLocal}</Alert>}
        {error && <Alert>{mensajeDeError(error)}</Alert>}
      </form>
    </Modal>
  )
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
