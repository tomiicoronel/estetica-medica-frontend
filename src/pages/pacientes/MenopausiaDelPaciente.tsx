import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarEvaluaciones } from '../../api/endpoints/menopausia'
import { Button } from '../../components/ui/Button'
import { ErrorDeCarga, Skeleton } from '../../components/ui/EstadoCarga'
import { Modal } from '../../components/ui/Modal'
import { Toast } from '../../components/ui/Toast'
import { formatearFecha } from '../../lib/fecha'
import {
  COLOR_SEVERIDAD,
  CORTES_POR_ESCALA,
  ETIQUETA_SEVERIDAD,
  LINEA_SEVERIDAD,
  NIVELES,
  SEVERIDADES,
  SUBESCALAS,
  nombreCorto,
  rango,
} from '../../lib/mrs'
import type { EvaluacionMenopausiaResponse, SeveridadMrs, UUID } from '../../types/api'
import { Badge, BotonAyuda, MrsFormulario } from './MrsFormulario'

/** `null` = historial; `{}` = toma nueva; con evaluación = edición. */
type Vista = null | { evaluacion?: EvaluacionMenopausiaResponse }

/**
 * Pestaña "Menopausia (MRS)".
 *
 * Un paciente puede tener muchas evaluaciones: la pestaña es un historial y el
 * valor está en comparar tomas, no en ver una sola. Los puntajes y severidades
 * que se muestran son los que calculó el backend, no los recalcula el front.
 */
export function MenopausiaDelPaciente({ pacienteId }: { pacienteId: UUID }) {
  const [vista, setVista] = useState<Vista>(null)
  const [ayuda, setAyuda] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const evaluaciones = useQuery({
    queryKey: ['mrs', pacienteId],
    queryFn: () => listarEvaluaciones(pacienteId),
  })

  // Llega de la más reciente a la más antigua.
  const lista = useMemo(() => evaluaciones.data ?? [], [evaluaciones.data])

  const filas = useMemo(
    () =>
      lista.map((evaluacion, indice) => ({
        evaluacion,
        // Contra la toma inmediatamente anterior en el tiempo, que por el orden
        // del listado es la siguiente del array.
        delta:
          indice + 1 < lista.length
            ? evaluacion.puntajeTotal - lista[indice + 1].puntajeTotal
            : null,
      })),
    [lista],
  )

  if (vista !== null) {
    return (
      <>
        <MrsFormulario
          pacienteId={pacienteId}
          evaluacion={vista.evaluacion}
          onVolver={() => setVista(null)}
          onListo={(mensaje) => {
            setVista(null)
            setAviso(mensaje)
          }}
          onAyuda={() => setAyuda(true)}
        />
        {ayuda && <ModalAyuda onCerrar={() => setAyuda(false)} />}
        {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3.5 app:flex-row app:items-end app:gap-5">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <h3 className="text-[15.5px] font-semibold">Ficha de menopausia — Escala MRS</h3>
          <span className="text-[12.5px] text-sand-700">{resumen(lista)}</span>
        </div>

        <div className="flex items-center gap-2.5 app:ml-auto">
          <BotonAyuda onClick={() => setAyuda(true)} />
          <Button className="flex-1 app:flex-none" onClick={() => setVista({})}>
            Nueva evaluación
          </Button>
        </div>
      </div>

      {evaluaciones.isPending && <Skeleton filas={3} />}
      {evaluaciones.error && <ErrorDeCarga error={evaluaciones.error} />}

      {evaluaciones.data && lista.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-7 py-13 text-center">
          <div className="flex size-13 items-center justify-center rounded-full bg-sage-100 text-lg font-semibold text-sage-800">
            MRS
          </div>
          <div className="text-[15px] font-semibold">Todavía no hay evaluaciones</div>
          <p className="max-w-[420px] text-[13.5px] leading-[1.6] text-sand-700">
            Cargá la primera toma de la escala MRS para tener un punto de partida. Repitiendo la
            evaluación en el tiempo vas a poder ver la evolución de los síntomas.
          </p>
          <Button className="mt-1.5" onClick={() => setVista({})}>
            Cargar primera evaluación
          </Button>
        </div>
      )}

      {/* Con una sola toma no hay evolución que graficar. */}
      {lista.length > 1 && <Grafico evaluaciones={lista} />}

      {lista.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-sand-50 app:block">
            <div className="grid min-w-[900px] grid-cols-[minmax(170px,1.1fr)_150px_repeat(3,minmax(140px,1fr))_96px] gap-4 border-b border-sand-200 bg-sand-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-sand-500">
              <span>Fecha</span>
              <span>Total</span>
              {SUBESCALAS.map((sub) => (
                <span key={sub.clave}>{nombreCorto(sub)}</span>
              ))}
              <span />
            </div>

            {filas.map(({ evaluacion, delta }) => (
              <div
                key={evaluacion.id}
                className="grid min-w-[900px] grid-cols-[minmax(170px,1.1fr)_150px_repeat(3,minmax(140px,1fr))_96px] items-center gap-4 border-b border-sand-100 px-5 py-[15px] last:border-b-0"
              >
                <span className="flex min-w-0 flex-col gap-[3px]">
                  <span className="text-[13.5px] font-semibold text-sage-800">
                    {formatearFecha(evaluacion.fechaEvaluacion)}
                  </span>
                  <Delta delta={delta} />
                </span>

                <span className="flex flex-col items-start gap-[5px]">
                  <span className="text-[19px] font-semibold leading-none text-sage-900">
                    {evaluacion.puntajeTotal}
                  </span>
                  <Badge severidad={evaluacion.severidadTotal} />
                </span>

                {subescalasDe(evaluacion).map((sub) => (
                  <span key={sub.clave} className="flex min-w-0 flex-col items-start gap-[5px]">
                    <span className="text-sm font-semibold text-sage-800">{sub.puntaje}</span>
                    <Badge severidad={sub.severidad} />
                  </span>
                ))}

                <button
                  type="button"
                  onClick={() => setVista({ evaluacion })}
                  className="justify-self-end rounded-[10px] border border-sand-300 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-sage-700 transition-colors hover:bg-sage-50"
                >
                  Ver
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 app:hidden">
            {filas.map(({ evaluacion, delta }) => (
              <div
                key={evaluacion.id}
                className="flex flex-col gap-3.5 rounded-2xl border border-sand-200 bg-sand-50 p-[18px]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-sm font-semibold text-sage-800">
                      {formatearFecha(evaluacion.fechaEvaluacion)}
                    </span>
                    <Delta delta={delta} />
                  </div>
                  <div className="flex flex-none flex-col items-end gap-[5px]">
                    <span className="text-[22px] font-semibold leading-none text-sage-900">
                      {evaluacion.puntajeTotal}
                    </span>
                    <Badge severidad={evaluacion.severidadTotal} />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 border-t border-sand-100 pt-3">
                  {subescalasDe(evaluacion).map((sub) => (
                    <div key={sub.clave} className="flex items-center gap-2.5">
                      <span className="flex-1 text-[12.5px] text-sand-700">{sub.titulo}</span>
                      <span className="text-[13.5px] font-semibold text-sage-800">
                        {sub.puntaje}
                      </span>
                      <Badge severidad={sub.severidad} />
                    </div>
                  ))}
                </div>

                <Button variante="secundario" onClick={() => setVista({ evaluacion })}>
                  Ver evaluación
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {ayuda && <ModalAyuda onCerrar={() => setAyuda(false)} />}
      {aviso && <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />}
    </div>
  )
}

/**
 * Evolución del puntaje total, de la toma más antigua a la más reciente.
 *
 * Las bandas de fondo son los cortes de severidad: sin ellas un 12 no dice
 * nada, con ellas se ve de un vistazo en qué franja cayó cada toma.
 */
function Grafico({ evaluaciones }: { evaluaciones: EvaluacionMenopausiaResponse[] }) {
  const ANCHO = 640
  const ALTO = 190
  const PAD_X = 14
  const PAD_Y = 12
  const MAXIMO = 44

  const cronologicas = [...evaluaciones].reverse()

  const x = (indice: number) =>
    cronologicas.length === 1
      ? ANCHO / 2
      : PAD_X + (indice * (ANCHO - PAD_X * 2)) / (cronologicas.length - 1)
  const y = (puntaje: number) => PAD_Y + (1 - puntaje / MAXIMO) * (ALTO - PAD_Y * 2)

  // [desde, hasta] de cada severidad sobre el total, en puntos.
  const bandas: { severidad: SeveridadMrs; desde: number; hasta: number }[] = [
    { severidad: 'NINGUNO_MINIMO', desde: 0, hasta: 4 },
    { severidad: 'LEVE', desde: 4, hasta: 8 },
    { severidad: 'MODERADO', desde: 8, hasta: 15 },
    { severidad: 'SEVERO', desde: 15, hasta: MAXIMO },
  ]

  const puntos = cronologicas.map((ev, i) => `${x(i)},${y(ev.puntajeTotal)}`).join(' ')

  // Cuartos exactos de la escala: quedan parejos y anclan los dos extremos, 0
  // y el máximo posible. Los cortes de severidad no sirven como marcas porque
  // 0-4-8 quedan amontonados abajo y las etiquetas se pisarían.
  const marcas = [0, 11, 22, 33, MAXIMO]

  /** Altura de un puntaje como porcentaje del alto renderizado del gráfico. */
  const porcentaje = (puntaje: number) => (y(puntaje) / ALTO) * 100

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-[22px]">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h4 className="text-sm font-semibold">Evolución del puntaje total</h4>
        <span className="text-[12.5px] text-sand-700">
          De {formatearFecha(cronologicas[0].fechaEvaluacion)} a{' '}
          {formatearFecha(cronologicas[cronologicas.length - 1].fechaEvaluacion)}
        </span>
      </div>

      {/* Las etiquetas del eje van en HTML y no como <text> del SVG: el SVG
          escala con el ancho de la tarjeta y en un celular los números
          quedarían de 5px. Así conservan su tamaño en cualquier pantalla. */}
      <div className="flex items-stretch gap-1.5">
        <div className="relative w-6 flex-none">
          {marcas.map((marca) => (
            <span
              key={marca}
              style={{ top: `${porcentaje(marca)}%` }}
              className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-sand-500"
            >
              {marca}
            </span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="h-auto w-full min-w-0 flex-1"
          role="img"
          aria-label={`Puntaje total en ${cronologicas.length} evaluaciones, de ${cronologicas[0].puntajeTotal} a ${cronologicas[cronologicas.length - 1].puntajeTotal} sobre ${MAXIMO}`}
        >
          {bandas.map((banda) => (
            <rect
              key={banda.severidad}
              x={0}
              y={y(banda.hasta)}
              width={ANCHO}
              height={y(banda.desde) - y(banda.hasta)}
              fill={COLOR_SEVERIDAD[banda.severidad]}
              opacity={0.16}
            />
          ))}

          {marcas.map((marca) => (
            <line
              key={marca}
              x1={0}
              x2={ANCHO}
              y1={y(marca)}
              y2={y(marca)}
              stroke="var(--color-sand-700)"
              strokeWidth={0.75}
              opacity={0.28}
            />
          ))}

          <polyline
            points={puntos}
            fill="none"
            stroke="var(--color-sage-600)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {cronologicas.map((ev, i) => (
            <circle
              key={ev.id}
              cx={x(i)}
              cy={y(ev.puntajeTotal)}
              r={5}
              fill="var(--color-sand-50)"
              stroke="var(--color-sage-600)"
              strokeWidth={2.5}
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {SEVERIDADES.map((severidad) => (
          <span key={severidad} className="flex items-center gap-1.5 text-xs text-sand-700">
            <span className={`size-2.5 flex-none rounded-full ${LINEA_SEVERIDAD[severidad]}`} />
            {ETIQUETA_SEVERIDAD[severidad]}
          </span>
        ))}
      </div>
    </div>
  )
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-sand-500">Primera toma</span>
  if (delta === 0) return <span className="text-xs text-sand-700">Sin cambios</span>

  // Menos puntaje es menos sintomatología: bajar es mejorar.
  const mejora = delta < 0
  return (
    <span className={`text-xs font-semibold ${mejora ? 'text-mrs-nulo-fg' : 'text-clay-700'}`}>
      {mejora ? '↓' : '↑'} {Math.abs(delta)} vs. anterior
    </span>
  )
}

function ModalAyuda({ onCerrar }: { onCerrar: () => void }) {
  return (
    <Modal
      titulo="Cómo se puntúa la escala MRS"
      subtitulo="Se registra la intensidad con la que el paciente percibe cada síntoma."
      onCerrar={onCerrar}
    >
      <div className="flex flex-col gap-2.5">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
          Valor de cada síntoma
        </span>
        {NIVELES.map((nivel, valor) => (
          <div
            key={nivel}
            className="flex items-center gap-3 rounded-control border border-sand-200 bg-white px-[13px] py-2.5"
          >
            <span className="flex size-7 flex-none items-center justify-center rounded-[9px] bg-sage-100 text-[13px] font-semibold text-sage-800">
              {valor}
            </span>
            <span className="text-[13.5px]">{nivel}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
          Cortes de severidad
        </span>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-sand-500">
                <th className="py-1.5 pr-3 font-semibold">Escala</th>
                {SEVERIDADES.map((severidad) => (
                  <th key={severidad} className="py-1.5 pr-3 font-semibold">
                    {ETIQUETA_SEVERIDAD[severidad]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CORTES_POR_ESCALA.map((escala) => (
                <tr key={escala.titulo} className="border-t border-sand-200">
                  <td className="py-2 pr-3 font-medium">{escala.titulo}</td>
                  {SEVERIDADES.map((severidad) => (
                    <td key={severidad} className="py-2 pr-3 text-sand-700">
                      {rango(severidad, escala.cortes)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[12.5px] leading-[1.55] text-sand-700">
        Los puntajes y las severidades los calcula el servidor a partir de los 11 síntomas.
      </p>
    </Modal>
  )
}

function subescalasDe(evaluacion: EvaluacionMenopausiaResponse) {
  return [
    {
      clave: 'somatica',
      titulo: 'Somática',
      puntaje: evaluacion.puntajeSomatica,
      severidad: evaluacion.severidadSomatica,
    },
    {
      clave: 'psicologica',
      titulo: 'Psicológica',
      puntaje: evaluacion.puntajePsicologica,
      severidad: evaluacion.severidadPsicologica,
    },
    {
      clave: 'urogenital',
      titulo: 'Urogenital',
      puntaje: evaluacion.puntajeUrogenital,
      severidad: evaluacion.severidadUrogenital,
    },
  ]
}

function resumen(lista: EvaluacionMenopausiaResponse[]): string {
  if (lista.length === 0) return 'Sin evaluaciones registradas.'

  const ultima = lista[0]
  const cuantas =
    lista.length === 1 ? '1 evaluación registrada' : `${lista.length} evaluaciones registradas`

  return `${cuantas} · última el ${formatearFecha(ultima.fechaEvaluacion)} — total ${
    ultima.puntajeTotal
  }/44 (${ETIQUETA_SEVERIDAD[ultima.severidadTotal].toLowerCase()})`
}
