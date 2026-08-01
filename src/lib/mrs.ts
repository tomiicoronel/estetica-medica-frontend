import type { EvaluacionMenopausiaRequest, PuntajeMrs, SeveridadMrs } from '../types/api'

/**
 * Escala MRS (Menopause Rating Scale).
 *
 * Los puntajes y las severidades los calcula y devuelve el backend; acá se
 * replican sólo para el formulario, que necesita mostrar el total en vivo
 * mientras se responde. Los cortes son los mismos que `SeveridadMrs` en el
 * backend y los que documenta GUIA_FRONTEND.md.
 */

/** Claves de los 11 síntomas dentro de `EvaluacionMenopausiaRequest`. */
export type ClaveSintoma = Extract<
  {
    [K in keyof EvaluacionMenopausiaRequest]: EvaluacionMenopausiaRequest[K] extends
      | PuntajeMrs
      | undefined
      ? K
      : never
  }[keyof EvaluacionMenopausiaRequest],
  string
>

export interface SubescalaMrs {
  clave: 'somatica' | 'psicologica' | 'urogenital'
  titulo: string
  maximo: number
  sintomas: { clave: ClaveSintoma; label: string }[]
  /** Cortes propios: cada subescala clasifica con umbrales distintos. */
  cortes: [number, number, number]
}

export const SUBESCALAS: SubescalaMrs[] = [
  {
    clave: 'somatica',
    titulo: 'Sintomatología somática',
    maximo: 16,
    cortes: [2, 4, 8],
    sintomas: [
      { clave: 'sofocosSudoracion', label: 'Sofocos y sudoración' },
      { clave: 'molestiasCardiacas', label: 'Molestias cardíacas' },
      { clave: 'trastornosSueno', label: 'Trastornos del sueño' },
      { clave: 'molestiasMuscularesArticulares', label: 'Molestias musculares y articulares' },
    ],
  },
  {
    clave: 'psicologica',
    titulo: 'Sintomatología psicológica',
    maximo: 16,
    cortes: [1, 3, 6],
    sintomas: [
      { clave: 'estadoAnimoDepresivo', label: 'Estado de ánimo depresivo' },
      { clave: 'irritabilidad', label: 'Irritabilidad' },
      { clave: 'ansiedad', label: 'Ansiedad' },
      { clave: 'cansancioFisicoMental', label: 'Cansancio físico y mental' },
    ],
  },
  {
    clave: 'urogenital',
    titulo: 'Sintomatología urogenital',
    maximo: 12,
    cortes: [0, 1, 3],
    sintomas: [
      { clave: 'problemasSexuales', label: 'Problemas sexuales' },
      { clave: 'problemasVejiga', label: 'Problemas de vejiga' },
      { clave: 'sequedadVaginal', label: 'Sequedad vaginal' },
    ],
  },
]

const CORTES_TOTAL: [number, number, number] = [4, 8, 15]

export const SINTOMAS: { clave: ClaveSintoma; label: string }[] = SUBESCALAS.flatMap(
  (sub) => sub.sintomas,
)

/** Qué significa cada valor 0-4. */
export const NIVELES = [
  'Ninguno',
  'Leve',
  'Moderado',
  'Grave',
  'Extremadamente grave',
] as const

export const ETIQUETA_SEVERIDAD: Record<SeveridadMrs, string> = {
  NINGUNO_MINIMO: 'Ninguno o mínimo',
  LEVE: 'Leve',
  MODERADO: 'Moderado',
  SEVERO: 'Severo',
}

/** Badge de severidad, con los colores del diseño. */
export const BADGE_SEVERIDAD: Record<SeveridadMrs, string> = {
  NINGUNO_MINIMO: 'bg-mrs-nulo-bg text-mrs-nulo-fg',
  LEVE: 'bg-mrs-leve-bg text-mrs-leve-fg',
  MODERADO: 'bg-mrs-moderado-bg text-mrs-moderado-fg',
  SEVERO: 'bg-mrs-severo-bg text-mrs-severo-fg',
}

/** Mismo color, como valor CSS: en SVG hace falta `fill`, no una clase `bg-*`. */
export const COLOR_SEVERIDAD: Record<SeveridadMrs, string> = {
  NINGUNO_MINIMO: 'var(--color-mrs-nulo-linea)',
  LEVE: 'var(--color-mrs-leve-linea)',
  MODERADO: 'var(--color-mrs-moderado-linea)',
  SEVERO: 'var(--color-mrs-severo-linea)',
}

/** Relleno de las barras y puntos de la leyenda. */
export const LINEA_SEVERIDAD: Record<SeveridadMrs, string> = {
  NINGUNO_MINIMO: 'bg-mrs-nulo-linea',
  LEVE: 'bg-mrs-leve-linea',
  MODERADO: 'bg-mrs-moderado-linea',
  SEVERO: 'bg-mrs-severo-linea',
}

export const SEVERIDADES: SeveridadMrs[] = ['NINGUNO_MINIMO', 'LEVE', 'MODERADO', 'SEVERO']

function clasificar(puntaje: number, cortes: [number, number, number]): SeveridadMrs {
  if (puntaje <= cortes[0]) return 'NINGUNO_MINIMO'
  if (puntaje <= cortes[1]) return 'LEVE'
  if (puntaje <= cortes[2]) return 'MODERADO'
  return 'SEVERO'
}

export interface PuntajesMrs {
  somatica: number
  psicologica: number
  urogenital: number
  total: number
  severidadSomatica: SeveridadMrs
  severidadPsicologica: SeveridadMrs
  severidadUrogenital: SeveridadMrs
  severidadTotal: SeveridadMrs
}

/** Puntajes en vivo mientras se completa el formulario. */
export function calcularPuntajes(
  respuestas: Partial<Record<ClaveSintoma, PuntajeMrs>>,
): PuntajesMrs {
  const sumar = (sub: SubescalaMrs) =>
    sub.sintomas.reduce((suma, sintoma) => suma + (respuestas[sintoma.clave] ?? 0), 0)

  const [somaticaSub, psicologicaSub, urogenitalSub] = SUBESCALAS
  const somatica = sumar(somaticaSub)
  const psicologica = sumar(psicologicaSub)
  const urogenital = sumar(urogenitalSub)

  return {
    somatica,
    psicologica,
    urogenital,
    total: somatica + psicologica + urogenital,
    severidadSomatica: clasificar(somatica, somaticaSub.cortes),
    severidadPsicologica: clasificar(psicologica, psicologicaSub.cortes),
    severidadUrogenital: clasificar(urogenital, urogenitalSub.cortes),
    severidadTotal: clasificar(somatica + psicologica + urogenital, CORTES_TOTAL),
  }
}

/** Rango textual de una severidad, para la ayuda de la escala ("5–8"). */
export function rango(severidad: SeveridadMrs, cortes: [number, number, number]): string {
  const indice = SEVERIDADES.indexOf(severidad)
  if (indice === 3) return `${cortes[2] + 1} o más`

  const desde = indice === 0 ? 0 : cortes[indice - 1] + 1
  const hasta = cortes[indice]
  // La urogenital tiene franjas de un solo punto: "0–0" se lee mal.
  return desde === hasta ? String(desde) : `${desde}–${hasta}`
}

/** Nombre corto de la subescala ("Sintomatología somática" → "Somática"). */
export function nombreCorto(sub: SubescalaMrs): string {
  const sinPrefijo = sub.titulo.replace('Sintomatología ', '')
  return sinPrefijo.charAt(0).toUpperCase() + sinPrefijo.slice(1)
}

export const CORTES_POR_ESCALA: { titulo: string; cortes: [number, number, number] }[] = [
  { titulo: 'Total (0-44)', cortes: CORTES_TOTAL },
  ...SUBESCALAS.map((sub) => ({
    titulo: `${nombreCorto(sub)} (0-${sub.maximo})`,
    cortes: sub.cortes,
  })),
]
