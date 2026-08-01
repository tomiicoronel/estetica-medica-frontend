import { api, apiBlob, apiUpload, query } from '../client'
import type {
  DiaFotosResumenResponse,
  FotoPacienteResponse,
  PageResponse,
  UUID,
} from '../../types/api'

/** Días que tienen fotos, de más reciente a más antiguo. */
export function listarDiasConFotos(pacienteId: UUID): Promise<DiaFotosResumenResponse[]> {
  return api.get<DiaFotosResumenResponse[]>(`/api/pacientes/${pacienteId}/fotos/por-dia`)
}

/** Fotos de un día, paginadas. Sin `fecha` pagina todas las del paciente. */
export function listarFotosPagina(
  pacienteId: UUID,
  filtros: { page?: number; size?: number; fecha?: string },
): Promise<PageResponse<FotoPacienteResponse>> {
  return api.get<PageResponse<FotoPacienteResponse>>(
    `/api/pacientes/${pacienteId}/fotos/pagina${query({ ...filtros })}`,
  )
}

/**
 * Sube una foto a una sesión clínica. El `Content-Type` lo pone el navegador
 * con el boundary del multipart: setearlo a mano rompe la subida.
 *
 * El backend acepta jpeg, png, webp y heic/heif, hasta 15 MB.
 */
export function subirFoto(
  sesionId: UUID,
  archivo: File,
  descripcion?: string,
): Promise<FotoPacienteResponse> {
  const form = new FormData()
  form.append('file', archivo)
  if (descripcion !== undefined && descripcion !== '') form.append('descripcion', descripcion)

  return apiUpload<FotoPacienteResponse>(`/api/sesiones-clinicas/${sesionId}/fotos`, form)
}

/**
 * Bytes de la imagen. Necesita el header Authorization, así que un `<img src>`
 * apuntando directo al endpoint devuelve 401: hay que bajar el blob.
 */
export function getContenidoFoto(fotoId: UUID): Promise<Blob> {
  return apiBlob(`/api/fotos/${fotoId}/contenido`)
}

export function eliminarFoto(fotoId: UUID): Promise<void> {
  return api.delete<void>(`/api/fotos/${fotoId}`)
}
