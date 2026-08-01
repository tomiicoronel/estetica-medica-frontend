import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import {
  actualizarHistoriaCorporal,
  actualizarHistoriaFacial,
  crearHistoriaCorporal,
  crearHistoriaFacial,
  getHistoriaCorporal,
  getHistoriaFacial,
} from '../../api/endpoints/historiaClinica'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Toast } from '../../components/ui/Toast'
import type { UUID } from '../../types/api'
import {
  SECCIONES_CORPORAL,
  SECCIONES_FACIAL,
  type CampoHC,
  type SeccionHC,
} from './camposHistoriaClinica'

type Tipo = 'facial' | 'corporal'

/** Mientras se edita, los números viven como texto para poder quedar vacíos. */
type Borrador = Record<string, string | boolean>

/**
 * Pestaña "Historia clínica".
 *
 * Facial y corporal son fichas únicas por paciente: mientras no existan el GET
 * devuelve 404, que acá no es un error sino el estado "sin cargar". De eso sale
 * si al guardar corresponde un POST (crear) o un PUT (reemplazar).
 */
export function HistoriaClinicaDelPaciente({ pacienteId }: { pacienteId: UUID }) {
  const [tipo, setTipo] = useState<Tipo>('facial')
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const secciones = tipo === 'facial' ? SECCIONES_FACIAL : SECCIONES_CORPORAL

  const historia = useQuery({
    queryKey: ['historia-clinica', tipo, pacienteId],
    queryFn: () =>
      tipo === 'facial' ? getHistoriaFacial(pacienteId) : getHistoriaCorporal(pacienteId),
    retry: false,
  })

  const sinCargar = historia.error instanceof ApiError && historia.error.status === 404
  const datos = useMemo(
    () => (historia.data ?? {}) as Record<string, unknown>,
    [historia.data],
  )

  const queryClient = useQueryClient()

  const guardar = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      const id = historia.data?.id
      if (tipo === 'facial') {
        return id === undefined
          ? crearHistoriaFacial(pacienteId, body)
          : actualizarHistoriaFacial(id, body)
      }
      return id === undefined
        ? crearHistoriaCorporal(pacienteId, body)
        : actualizarHistoriaCorporal(id, body)
    },
    onSuccess: async () => {
      setBorrador(null)
      await queryClient.invalidateQueries({ queryKey: ['historia-clinica', tipo, pacienteId] })
      setAviso('Historia clínica guardada.')
    },
  })

  function editar() {
    setBorrador(aBorrador(secciones, datos))
  }

  function cambiarTipo(nuevo: Tipo) {
    setTipo(nuevo)
    // El borrador es de una ficha concreta: no puede sobrevivir al cambio.
    setBorrador(null)
    guardar.reset()
  }

  const editando = borrador !== null
  const completados = contarCompletados(secciones, editando ? borrador : datos)
  const total = contarCampos(secciones)

  /** Mensajes por campo de un 400 de validación. */
  const errores = guardar.error instanceof ApiError ? guardar.error.mensajes : undefined
  const errorDe = (clave: string) => errores?.[clave]

  // La ficha es larguísima: sin esto el aviso queda arriba de todo y el campo
  // rechazado a varias pantallas de scroll, sin ninguna pista de cuál es.
  useEffect(() => {
    if (errores === undefined) return

    const primero = todosLosCampos(secciones).find(
      (campo) => campo.tipo !== 'casillas' && errores[campo.clave] !== undefined,
    )
    if (primero === undefined || primero.tipo === 'casillas') return

    document
      .getElementById(anclaDe(primero.clave))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [errores, secciones])

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 rounded-control border border-sand-200 bg-sand-50 p-1">
          {(['facial', 'corporal'] as const).map((clave) => (
            <button
              key={clave}
              type="button"
              onClick={() => cambiarTipo(clave)}
              aria-pressed={tipo === clave}
              className={`rounded-[9px] px-[13px] py-2.5 text-[12.5px] font-semibold transition-colors app:py-1.5 ${
                tipo === clave ? 'bg-sage-600 text-white' : 'text-sand-700 hover:bg-sage-50'
              }`}
            >
              {clave === 'facial' ? 'Ficha facial' : 'Ficha corporal'}
            </button>
          ))}
        </div>

        {(historia.data || sinCargar) && (
          <span className="text-[12.5px] text-sand-700">
            {completados} de {total} campos completados
          </span>
        )}

        <span className="ml-auto flex flex-wrap gap-[9px]">
          {editando && (
            <Button variante="secundario" onClick={() => setBorrador(null)}>
              Cancelar
            </Button>
          )}
          {(historia.data || sinCargar) && (
            <Button
              cargando={guardar.isPending}
              onClick={() =>
                editando ? guardar.mutate(aRequest(secciones, borrador)) : editar()
              }
            >
              {editando ? 'Guardar ficha' : sinCargar ? 'Completar ficha' : 'Editar ficha'}
            </Button>
          )}
        </span>
      </div>

      {historia.isPending && <Skeleton filas={4} />}
      {historia.error && !sinCargar && <ErrorDeCarga error={historia.error} />}
      {guardar.error && <Alert>{mensajeDeError(guardar.error)}</Alert>}

      {sinCargar && !editando && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-13 text-center">
          <div className="text-sm font-medium">
            La ficha {tipo === 'facial' ? 'facial' : 'corporal'} todavía no está cargada
          </div>
          <div className="text-[13px] text-sand-700">
            Completala para tener los antecedentes a mano antes de cada sesión.
          </div>
        </div>
      )}

      {(historia.data || editando) &&
        secciones.map((seccion) => (
          <Seccion
            key={seccion.titulo}
            seccion={seccion}
            datos={datos}
            borrador={borrador}
            onCambio={(clave, valor) =>
              setBorrador((previo) => (previo === null ? previo : { ...previo, [clave]: valor }))
            }
            errorDe={errorDe}
          />
        ))}

      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </div>
  )
}

function Seccion({
  seccion,
  datos,
  borrador,
  onCambio,
  errorDe,
}: {
  seccion: SeccionHC
  datos: Record<string, unknown>
  borrador: Borrador | null
  onCambio: (clave: string, valor: string | boolean) => void
  errorDe: (clave: string) => string | undefined
}) {
  return (
    <div className="flex flex-col gap-[18px] rounded-2xl border border-sand-200 bg-sand-50 p-[22px]">
      <h3 className="text-[14.5px] font-semibold">{seccion.titulo}</h3>

      <div className="grid gap-4 app:grid-cols-2 app:gap-x-6">
        {seccion.campos.map((campo) => (
          <Campo
            key={campo.tipo === 'casillas' ? campo.label : campo.clave}
            campo={campo}
            datos={datos}
            borrador={borrador}
            onCambio={onCambio}
            errorDe={errorDe}
          />
        ))}
      </div>
    </div>
  )
}

/** Ancla para poder llevar el scroll al campo que el backend rechazó. */
function anclaDe(clave: string): string {
  return `hc-campo-${clave}`
}

function Campo({
  campo,
  datos,
  borrador,
  onCambio,
  errorDe,
}: {
  campo: CampoHC
  datos: Record<string, unknown>
  borrador: Borrador | null
  onCambio: (clave: string, valor: string | boolean) => void
  errorDe: (clave: string) => string | undefined
}) {
  if (campo.tipo === 'casillas') {
    const marcadas = campo.opciones.filter((opcion) =>
      borrador === null ? datos[opcion.clave] === true : borrador[opcion.clave] === true,
    )

    // Un grupo de casillas ocupa el ancho completo: si no, con 12 antecedentes
    // la columna queda altísima al lado de un campo de una línea.
    return (
      <div className="flex flex-col gap-[7px] app:col-span-2">
        <Etiqueta>{campo.label}</Etiqueta>

        {borrador === null ? (
          <span className={`text-sm ${marcadas.length === 0 ? 'text-sand-500' : ''}`}>
            {marcadas.length === 0
              ? 'Sin registrar'
              : marcadas.map((opcion) => opcion.label).join(' · ')}
          </span>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {campo.opciones.map((opcion) => (
              <label
                key={opcion.clave}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-sm app:min-h-0"
              >
                <input
                  type="checkbox"
                  checked={borrador[opcion.clave] === true}
                  onChange={(e) => onCambio(opcion.clave, e.target.checked)}
                  className="size-4 flex-none accent-sage-600"
                />
                {opcion.label}
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (borrador === null) {
    const valor = datos[campo.clave]
    const texto =
      valor === null || valor === undefined || valor === '' ? null : String(valor)

    return (
      <div className={`flex min-w-0 flex-col gap-[7px] ${campo.tipo === 'largo' ? 'app:col-span-2' : ''}`}>
        <Etiqueta>{campo.label}</Etiqueta>
        <span className={`break-words text-sm ${texto === null ? 'text-sand-500' : ''}`}>
          {texto ?? 'Sin datos'}
        </span>
      </div>
    )
  }

  const valor = String(borrador[campo.clave] ?? '')

  if (campo.tipo === 'largo') {
    return (
      <div id={anclaDe(campo.clave)} className="app:col-span-2">
        <Textarea
          label={campo.label}
          superficie="blanco"
          rows={2}
          value={valor}
          onChange={(e) => onCambio(campo.clave, e.target.value)}
          error={errorDe(campo.clave)}
        />
      </div>
    )
  }

  return (
    <div id={anclaDe(campo.clave)}>
      <Input
        label={campo.label}
        superficie="blanco"
        type={campo.tipo === 'numero' ? 'number' : 'text'}
        min={campo.tipo === 'numero' ? campo.min : undefined}
        max={campo.tipo === 'numero' ? campo.max : undefined}
        step={campo.tipo === 'numero' ? campo.paso : undefined}
        value={valor}
        onChange={(e) => onCambio(campo.clave, e.target.value)}
        error={errorDe(campo.clave)}
      />
    </div>
  )
}

function Etiqueta({ children }: { children: string }) {
  return (
    <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
      {children}
    </span>
  )
}

/** Response (o vacío) → borrador editable. */
function aBorrador(secciones: SeccionHC[], datos: Record<string, unknown>): Borrador {
  const borrador: Borrador = {}

  for (const campo of todosLosCampos(secciones)) {
    if (campo.tipo === 'casillas') {
      for (const opcion of campo.opciones) borrador[opcion.clave] = datos[opcion.clave] === true
      continue
    }
    const valor = datos[campo.clave]
    borrador[campo.clave] = valor === null || valor === undefined ? '' : String(valor)
  }

  return borrador
}

/**
 * Borrador → body del request.
 *
 * El PUT reemplaza la ficha entera, así que hay que mandar todos los campos.
 * Los vacíos van como `undefined` (Jackson los deja en null) en vez de string
 * vacío, para no guardar textos en blanco que después se muestran como datos.
 */
function aRequest(secciones: SeccionHC[], borrador: Borrador | null): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (borrador === null) return body

  for (const campo of todosLosCampos(secciones)) {
    if (campo.tipo === 'casillas') {
      for (const opcion of campo.opciones) body[opcion.clave] = borrador[opcion.clave] === true
      continue
    }

    const valor = String(borrador[campo.clave] ?? '').trim()
    if (valor === '') {
      body[campo.clave] = undefined
      continue
    }
    body[campo.clave] = campo.tipo === 'numero' ? Number(valor) : valor
  }

  return body
}

function todosLosCampos(secciones: SeccionHC[]): CampoHC[] {
  return secciones.flatMap((seccion) => seccion.campos)
}

/**
 * Sólo se cuentan los campos de texto y número: una casilla sin tildar es una
 * respuesta ("no lo tiene"), no un campo pendiente, y contarlas como faltantes
 * daría una completitud siempre baja aunque la ficha esté terminada.
 */
function contarCampos(secciones: SeccionHC[]): number {
  return todosLosCampos(secciones).filter((campo) => campo.tipo !== 'casillas').length
}

function contarCompletados(
  secciones: SeccionHC[],
  datos: Record<string, unknown> | Borrador,
): number {
  return todosLosCampos(secciones).filter((campo) => {
    if (campo.tipo === 'casillas') return false
    const valor = datos[campo.clave]
    return valor !== null && valor !== undefined && String(valor).trim() !== ''
  }).length
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
