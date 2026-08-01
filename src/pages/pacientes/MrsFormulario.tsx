import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import {
  actualizarEvaluacion,
  crearEvaluacion,
  eliminarEvaluacion,
} from '../../api/endpoints/menopausia'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CampoFecha } from '../../components/ui/CampoFecha'
import { Textarea } from '../../components/ui/Textarea'
import { aFechaISO } from '../../lib/formato'
import {
  BADGE_SEVERIDAD,
  ETIQUETA_SEVERIDAD,
  LINEA_SEVERIDAD,
  NIVELES,
  SINTOMAS,
  SUBESCALAS,
  calcularPuntajes,
  nombreCorto,
  type ClaveSintoma,
} from '../../lib/mrs'
import type {
  EvaluacionMenopausiaRequest,
  EvaluacionMenopausiaResponse,
  PuntajeMrs,
  UUID,
} from '../../types/api'

type Respuestas = Partial<Record<ClaveSintoma, PuntajeMrs>>

interface Props {
  pacienteId: UUID
  /** Evaluación existente si se está editando; ausente si es una toma nueva. */
  evaluacion?: EvaluacionMenopausiaResponse
  onVolver: () => void
  onListo: (mensaje: string) => void
  onAyuda: () => void
}

export function MrsFormulario({ pacienteId, evaluacion, onVolver, onListo, onAyuda }: Props) {
  const [fecha, setFecha] = useState(evaluacion?.fechaEvaluacion ?? aFechaISO(new Date()))
  const [observaciones, setObservaciones] = useState(evaluacion?.observaciones ?? '')
  const [respuestas, setRespuestas] = useState<Respuestas>(() => respuestasDe(evaluacion))
  const [faltantes, setFaltantes] = useState(false)

  const puntajes = calcularPuntajes(respuestas)
  const respondidos = SINTOMAS.filter((s) => respuestas[s.clave] !== undefined).length
  const completo = respondidos === SINTOMAS.length

  const queryClient = useQueryClient()

  async function refrescar() {
    await queryClient.invalidateQueries({ queryKey: ['mrs', pacienteId] })
  }

  const guardar = useMutation({
    mutationFn: (body: EvaluacionMenopausiaRequest) =>
      evaluacion === undefined
        ? crearEvaluacion(pacienteId, body)
        : actualizarEvaluacion(evaluacion.id, body),
    onSuccess: async () => {
      await refrescar()
      onListo(evaluacion === undefined ? 'Evaluación registrada.' : 'Evaluación actualizada.')
    },
  })

  const borrar = useMutation({
    mutationFn: () => eliminarEvaluacion(evaluacion?.id ?? ''),
    onSuccess: async () => {
      await refrescar()
      onListo('Evaluación eliminada.')
    },
  })

  function onGuardar() {
    // Los 11 síntomas son obligatorios: sin esto el backend responde 400 y el
    // error genérico no diría cuál falta.
    if (!completo) {
      setFaltantes(true)
      return
    }
    setFaltantes(false)

    guardar.mutate({
      ...(respuestas as Required<Respuestas>),
      fechaEvaluacion: fecha === '' ? undefined : fecha,
      observaciones: observaciones.trim() === '' ? undefined : observaciones.trim(),
    } as EvaluacionMenopausiaRequest)
  }

  const error = guardar.error ?? borrar.error

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3.5 app:flex-row app:items-end app:gap-5">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <button
            type="button"
            onClick={onVolver}
            className="self-start text-[13px] text-sand-700 transition-colors hover:text-sage-800"
          >
            ← Volver al historial
          </button>
          <h3 className="text-[15.5px] font-semibold">
            {evaluacion === undefined ? 'Nueva evaluación MRS' : 'Editar evaluación MRS'}
          </h3>
        </div>

        <BotonAyuda onClick={onAyuda} className="app:ml-auto" />
      </div>

      <div className="flex flex-col-reverse gap-3.5 app:grid app:grid-cols-[minmax(0,1fr)_320px] app:items-start app:gap-[18px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-sand-200 bg-sand-50 p-5">
            <CampoFecha
              label="Fecha de la evaluación"
              superficie="blanco"
              value={fecha}
              onChange={setFecha}
              // El backend rechaza fechas futuras: no tiene sentido ofrecerlas.
              anioMaximo={new Date().getFullYear()}
            />
            <span className="pb-3 text-[12.5px] text-sand-700">
              {respondidos} de {SINTOMAS.length} síntomas puntuados
            </span>
          </div>

          {SUBESCALAS.map((sub) => {
            const puntaje = puntajes[sub.clave]
            const severidad =
              sub.clave === 'somatica'
                ? puntajes.severidadSomatica
                : sub.clave === 'psicologica'
                  ? puntajes.severidadPsicologica
                  : puntajes.severidadUrogenital

            return (
              <div
                key={sub.clave}
                className="flex flex-col gap-1.5 rounded-2xl border border-sand-200 bg-sand-50 px-[22px] py-5"
              >
                <div className="flex flex-wrap items-baseline gap-2.5 pb-2">
                  <h4 className="text-sm font-semibold">{sub.titulo}</h4>
                  <span className="text-xs text-sand-500">
                    {puntaje} de {sub.maximo} puntos
                  </span>
                  <Badge severidad={severidad} />
                </div>

                {sub.sintomas.map((sintoma) => (
                  <div
                    key={sintoma.clave}
                    className="flex flex-col gap-2.5 border-b border-sand-100 py-3 last:border-b-0 app:flex-row app:flex-wrap app:items-center app:justify-between app:gap-6 app:py-2.5"
                  >
                    <span className="min-w-0 flex-1 text-sm leading-[1.45]">
                      {sintoma.label}
                      {faltantes && respuestas[sintoma.clave] === undefined && (
                        <span className="ml-2 text-xs font-semibold text-clay-700">Sin puntuar</span>
                      )}
                    </span>

                    <div className="flex flex-none gap-[7px]">
                      {([0, 1, 2, 3, 4] as const).map((valor) => {
                        const elegido = respuestas[sintoma.clave] === valor
                        return (
                          <button
                            key={valor}
                            type="button"
                            title={NIVELES[valor]}
                            aria-label={`${sintoma.label}: ${NIVELES[valor]}`}
                            aria-pressed={elegido}
                            onClick={() =>
                              setRespuestas((previas) => ({ ...previas, [sintoma.clave]: valor }))
                            }
                            className={`size-11 flex-1 rounded-[10px] border text-sm font-semibold transition-colors app:size-9 app:flex-none ${
                              elegido
                                ? 'border-sage-600 bg-sage-600 text-white'
                                : 'border-sand-300 bg-white text-sage-700 hover:bg-sage-50'
                            }`}
                          >
                            {valor}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          <div className="rounded-2xl border border-sand-200 bg-sand-50 px-[22px] py-5">
            <Textarea
              label="Observaciones"
              superficie="blanco"
              rows={4}
              placeholder="Contexto clínico, medicación, cambios desde la última toma…"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-sand-200 bg-sand-50 p-5 app:sticky app:top-6">
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
              Puntaje en vivo
            </span>
            <div className="flex items-end gap-2.5">
              <span className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-sage-900">
                {puntajes.total}
              </span>
              <span className="pb-[5px] text-[13px] text-sand-700">/ 44</span>
            </div>
            <Badge severidad={puntajes.severidadTotal} />
          </div>

          <div className="flex flex-col gap-[13px] border-t border-sand-100 pt-[15px]">
            {SUBESCALAS.map((sub) => {
              const puntaje = puntajes[sub.clave]
              const severidad =
                sub.clave === 'somatica'
                  ? puntajes.severidadSomatica
                  : sub.clave === 'psicologica'
                    ? puntajes.severidadPsicologica
                    : puntajes.severidadUrogenital

              return (
                <div key={sub.clave} className="flex flex-col gap-[7px]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex-1 text-[12.5px] text-sand-700">
                      {nombreCorto(sub)}
                    </span>
                    <span className="text-[13.5px] font-semibold text-sage-800">
                      {puntaje}/{sub.maximo}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sand-200">
                    <div
                      className={`h-full rounded-full ${LINEA_SEVERIDAD[severidad]}`}
                      style={{ width: `${(puntaje / sub.maximo) * 100}%` }}
                    />
                  </div>
                  <Badge severidad={severidad} />
                </div>
              )
            })}
          </div>

          {faltantes && !completo && (
            <Alert>Faltan {SINTOMAS.length - respondidos} síntomas por puntuar.</Alert>
          )}
          {error && <Alert>{mensajeDeError(error)}</Alert>}

          <div className="flex gap-2.5 border-t border-sand-100 pt-[15px]">
            <Button variante="secundario" onClick={onVolver}>
              Cancelar
            </Button>
            <Button className="flex-1" cargando={guardar.isPending} onClick={onGuardar}>
              Guardar evaluación
            </Button>
          </div>

          {evaluacion !== undefined && (
            <BorrarEvaluacion cargando={borrar.isPending} onConfirmar={() => borrar.mutate()} />
          )}
        </div>
      </div>
    </div>
  )
}

/** Pide confirmación en el lugar: borrar una toma no se puede deshacer. */
function BorrarEvaluacion({
  cargando,
  onConfirmar,
}: {
  cargando: boolean
  onConfirmar: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="self-start text-[12.5px] font-semibold text-clay-700 hover:underline"
      >
        Eliminar esta evaluación
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[12.5px] text-sand-700">
        Se elimina la toma completa y no se puede recuperar.
      </span>
      <div className="flex gap-2.5">
        <Button variante="secundario" onClick={() => setConfirmando(false)}>
          No
        </Button>
        <Button variante="peligro" className="flex-1" cargando={cargando} onClick={onConfirmar}>
          Sí, eliminar
        </Button>
      </div>
    </div>
  )
}

export function Badge({ severidad }: { severidad: keyof typeof BADGE_SEVERIDAD }) {
  return (
    <span
      className={`inline-flex w-fit flex-none items-center justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${BADGE_SEVERIDAD[severidad]}`}
    >
      {ETIQUETA_SEVERIDAD[severidad]}
    </span>
  )
}

export function BotonAyuda({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Cómo se puntúa la escala"
      aria-label="Cómo se puntúa la escala"
      className={`flex size-11 flex-none items-center justify-center rounded-full border border-sand-300 bg-white text-sm font-semibold italic text-sand-700 transition-colors hover:bg-sage-50 app:size-9.5 ${className}`}
    >
      i
    </button>
  )
}

function respuestasDe(evaluacion?: EvaluacionMenopausiaResponse): Respuestas {
  if (evaluacion === undefined) return {}

  const respuestas: Respuestas = {}
  for (const sintoma of SINTOMAS) respuestas[sintoma.clave] = evaluacion[sintoma.clave]
  return respuestas
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
