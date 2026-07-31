import { clearSession, getToken } from '../auth/session'
import type { ErrorResponse, ValidationErrorResponse } from '../types/api'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

/** Mensaje exacto con el que el backend avisa que falta el cambio de contraseña inicial. */
const MENSAJE_CAMBIO_PASSWORD = 'Debe cambiar su contraseña inicial antes de usar el sistema'

/**
 * Error normalizado de la API. Todas las pantallas manejan este tipo, nunca el
 * Response crudo.
 */
export class ApiError extends Error {
  readonly status: number
  /** Errores por campo de un 400 de validación (`ValidationErrorResponse.mensajes`). */
  readonly mensajes?: Record<string, string>
  /** 403 por `debeCambiarPassword=true`: hay que mandar a /cambiar-password. */
  readonly requiereCambioPassword: boolean

  constructor(
    status: number,
    mensaje: string,
    mensajes?: Record<string, string>,
    requiereCambioPassword = false,
  ) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.mensajes = mensajes
    this.requiereCambioPassword = requiereCambioPassword
  }

  /** Mensaje para un campo puntual de formulario, si el 400 lo trae. */
  campo(nombre: string): string | undefined {
    return this.mensajes?.[nombre]
  }
}

function esValidationError(data: unknown): data is ValidationErrorResponse {
  return typeof data === 'object' && data !== null && 'mensajes' in data
}

function esErrorResponse(data: unknown): data is ErrorResponse {
  return typeof data === 'object' && data !== null && 'mensaje' in data
}

/**
 * Traduce una respuesta no-OK al ApiError correspondiente y aplica los efectos
 * globales que pide GUIA_FRONTEND.md (401 → cerrar sesión).
 */
async function construirError(response: Response): Promise<ApiError> {
  const data: unknown = await response.json().catch(() => undefined)

  if (response.status === 401) {
    // Token ausente, inválido o vencido. El guard de rutas manda a /login.
    clearSession()
    return new ApiError(401, 'Tu sesión expiró. Ingresá de nuevo.')
  }

  if (esValidationError(data)) {
    const primero = Object.values(data.mensajes)[0]
    return new ApiError(response.status, primero ?? 'Revisá los datos del formulario.', data.mensajes)
  }

  if (esErrorResponse(data)) {
    const requiereCambio =
      response.status === 403 && data.mensaje.includes(MENSAJE_CAMBIO_PASSWORD)
    return new ApiError(response.status, data.mensaje, undefined, requiereCambio)
  }

  return new ApiError(response.status, 'Error inesperado. Intentá de nuevo.')
}

function authHeader(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Request JSON. Devuelve `undefined` en 204. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) throw await construirError(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string) => apiFetch<T>(path, { method: 'PATCH' }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}

/**
 * Subida multipart (fotos de evolución).
 * No se setea Content-Type a mano: el navegador tiene que poner el boundary.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  })

  if (!response.ok) throw await construirError(response)
  return (await response.json()) as T
}

/**
 * Descarga binaria autenticada.
 * `GET /api/fotos/{id}/contenido` exige el header Authorization, así que un
 * `<img src>` directo falla: hay que bajar el blob y armar un object URL.
 * Quien lo use debe llamar a URL.revokeObjectURL al desmontar.
 */
export async function apiBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeader() })

  if (!response.ok) throw await construirError(response)
  return await response.blob()
}

/** Serializa query params salteando los vacíos (los filtros del backend son opcionales). */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }

  const texto = search.toString()
  return texto ? `?${texto}` : ''
}
