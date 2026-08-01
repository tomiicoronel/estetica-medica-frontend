/**
 * Estructura de las dos historias clínicas.
 *
 * La facial y la corporal comparten casi toda la primera mitad y se separan en
 * hábitos y examen. Están descritas como datos y no como JSX para que la
 * pantalla sea una sola: si fueran dos formularios escritos a mano habría que
 * mantener dos veces el mismo bloque de antecedentes.
 *
 * El orden y los nombres de campo son los de `HistoriaClinica*Request`.
 */

export type CampoHC =
  /** Grupo de booleanos que se marcan juntos (antecedentes, alergias, etc.). */
  | { tipo: 'casillas'; label: string; opciones: { clave: string; label: string }[] }
  /** Texto de una línea. */
  | { tipo: 'texto'; clave: string; label: string }
  /** Texto largo; el backend acepta hasta 5000 caracteres. */
  | { tipo: 'largo'; clave: string; label: string }
  | { tipo: 'numero'; clave: string; label: string; min?: number; max?: number; paso?: string }

export interface SeccionHC {
  titulo: string
  campos: CampoHC[]
}

/** Los 12 antecedentes patológicos que comparten las dos fichas. */
const PATOLOGICOS_COMUNES = [
  { clave: 'hta', label: 'HTA' },
  { clave: 'dbt', label: 'Diabetes' },
  { clave: 'hipotiroidismo', label: 'Hipotiroidismo' },
  { clave: 'hipertiroidismo', label: 'Hipertiroidismo' },
  { clave: 'anemia', label: 'Anemia' },
  { clave: 'enfermedadesAutoinmunes', label: 'Enfermedades autoinmunes' },
  { clave: 'glaucoma', label: 'Glaucoma' },
  { clave: 'enfermedadNeuromuscular', label: 'Enfermedad neuromuscular' },
  { clave: 'trastornosCoagulacion', label: 'Trastornos de coagulación' },
  { clave: 'alteracionCicatrizacion', label: 'Alteración de cicatrización' },
  { clave: 'marcapasos', label: 'Marcapasos' },
  { clave: 'protesisMetalica', label: 'Prótesis metálica' },
]

const TOXICOS: SeccionHC = {
  titulo: 'Antecedentes tóxicos',
  campos: [
    {
      tipo: 'casillas',
      label: 'Consumos',
      opciones: [
        { clave: 'tbq', label: 'Tabaquismo' },
        { clave: 'alcohol', label: 'Alcohol' },
      ],
    },
    { tipo: 'largo', clave: 'otrasToxico', label: 'Otros antecedentes tóxicos' },
  ],
}

const ALERGIAS: SeccionHC = {
  titulo: 'Alergias',
  campos: [
    {
      tipo: 'casillas',
      label: 'Alergias conocidas',
      opciones: [
        { clave: 'alergicoHuevo', label: 'Huevo' },
        { clave: 'alergicoAnestesia', label: 'Anestesia' },
        { clave: 'alergicoFish', label: 'Pescado' },
      ],
    },
    { tipo: 'largo', clave: 'otrasAlergias', label: 'Otras alergias' },
  ],
}

const MEDICACION: SeccionHC = {
  titulo: 'Medicación',
  campos: [
    { tipo: 'largo', clave: 'medicacionHabitual', label: 'Medicación habitual' },
    {
      tipo: 'casillas',
      label: 'Última semana',
      opciones: [{ clave: 'aspirinaSemana', label: 'Tomó aspirina' }],
    },
  ],
}

const DIAGNOSTICO: SeccionHC = {
  titulo: 'Diagnóstico',
  campos: [
    { tipo: 'largo', clave: 'diagnosticoYTratamiento', label: 'Diagnóstico y tratamiento' },
    { tipo: 'largo', clave: 'observacionesPosteriores', label: 'Observaciones posteriores' },
  ],
}

export const SECCIONES_FACIAL: SeccionHC[] = [
  {
    titulo: 'Antecedentes patológicos',
    campos: [
      { tipo: 'casillas', label: 'Antecedentes', opciones: PATOLOGICOS_COMUNES },
      { tipo: 'largo', clave: 'otroAntecedentePatologico', label: 'Otros antecedentes' },
    ],
  },
  TOXICOS,
  ALERGIAS,
  {
    titulo: 'Quirúrgicos y ginecológicos',
    campos: [
      { tipo: 'largo', clave: 'antecedentesQuirurgicos', label: 'Antecedentes quirúrgicos' },
      { tipo: 'texto', clave: 'fum', label: 'FUM' },
      {
        tipo: 'casillas',
        label: 'Situación actual',
        opciones: [
          { clave: 'embarazo', label: 'Embarazo' },
          { clave: 'herpesLabial', label: 'Herpes labial' },
        ],
      },
    ],
  },
  MEDICACION,
  {
    titulo: 'Hábitos',
    campos: [
      {
        tipo: 'casillas',
        label: 'Sol',
        opciones: [
          { clave: 'exposicionSolar', label: 'Exposición solar frecuente' },
          { clave: 'usaProteccionSolar', label: 'Usa protección solar' },
        ],
      },
      { tipo: 'texto', clave: 'proteccionSolarCual', label: 'Qué protección solar usa' },
      { tipo: 'texto', clave: 'proteccionSolarVecesDia', label: 'Veces por día' },
      { tipo: 'largo', clave: 'habitosHigieneFacial', label: 'Hábitos de higiene facial' },
      { tipo: 'largo', clave: 'tratamientoDomiciliario', label: 'Tratamiento domiciliario' },
    ],
  },
  {
    titulo: 'Tratamientos previos',
    campos: [
      {
        tipo: 'casillas',
        label: 'Antecedentes de tratamiento',
        opciones: [
          { clave: 'tratamientosPrevios', label: 'Tuvo tratamientos faciales previos' },
          { clave: 'viajeProximoMes', label: 'Viaja el próximo mes' },
        ],
      },
      { tipo: 'largo', clave: 'tratamientosPreviosCuales', label: 'Cuáles' },
      { tipo: 'largo', clave: 'tratamientosPreviosRespuesta', label: 'Respuesta a esos tratamientos' },
      { tipo: 'largo', clave: 'presenciaOtrosMateriales', label: 'Presencia de otros materiales' },
      { tipo: 'largo', clave: 'secuelasTratamientosPrevios', label: 'Secuelas' },
    ],
  },
  {
    titulo: 'Examen',
    campos: [
      {
        tipo: 'casillas',
        label: 'Registro',
        opciones: [{ clave: 'seTomaFotografia', label: 'Se toma fotografía clínica' }],
      },
      { tipo: 'numero', clave: 'fototipoFitzpatrick', label: 'Fototipo Fitzpatrick (1 a 6)', min: 1, max: 6 },
      { tipo: 'numero', clave: 'gradoGlogau', label: 'Grado Glogau (1 a 4)', min: 1, max: 4 },
    ],
  },
  DIAGNOSTICO,
]

export const SECCIONES_CORPORAL: SeccionHC[] = [
  {
    titulo: 'Antecedentes patológicos',
    campos: [
      {
        tipo: 'casillas',
        label: 'Antecedentes',
        // La ficha corporal suma "cáncer", que la facial no tiene.
        opciones: [...PATOLOGICOS_COMUNES, { clave: 'cancer', label: 'Cáncer' }],
      },
      { tipo: 'largo', clave: 'otroAntecedentePatologico', label: 'Otros antecedentes' },
    ],
  },
  TOXICOS,
  ALERGIAS,
  {
    titulo: 'Quirúrgicos y ginecológicos',
    campos: [
      { tipo: 'largo', clave: 'antecedentesQuirurgicos', label: 'Antecedentes quirúrgicos' },
      { tipo: 'texto', clave: 'fum', label: 'FUM' },
      {
        tipo: 'casillas',
        label: 'Situación actual',
        opciones: [
          { clave: 'embarazo', label: 'Embarazo' },
          { clave: 'lactancia', label: 'Lactancia' },
          { clave: 'herpesLabial', label: 'Herpes labial' },
        ],
      },
    ],
  },
  MEDICACION,
  {
    titulo: 'Hábitos',
    campos: [
      {
        tipo: 'casillas',
        label: 'Estilo de vida',
        opciones: [
          { clave: 'alimentacionSaludable', label: 'Alimentación saludable' },
          { clave: 'bebeAgua', label: 'Bebe agua habitualmente' },
          { clave: 'ortostatismoProlongado', label: 'Muchas horas de pie' },
          { clave: 'mediasCompresion', label: 'Usa medias de compresión' },
        ],
      },
      { tipo: 'largo', clave: 'sedentarismoGimnasia', label: 'Sedentarismo / actividad física' },
    ],
  },
  {
    titulo: 'Tratamientos previos',
    campos: [
      {
        tipo: 'casillas',
        label: 'Antecedentes de tratamiento',
        opciones: [
          { clave: 'tratamientosPrevios', label: 'Tuvo tratamientos corporales previos' },
          { clave: 'viajeProximoMes', label: 'Viaja el próximo mes' },
        ],
      },
      { tipo: 'largo', clave: 'tratamientosPreviosCuales', label: 'Cuáles' },
      { tipo: 'largo', clave: 'tratamientosPreviosCuando', label: 'Cuándo' },
      { tipo: 'largo', clave: 'tratamientosPreviosRespuesta', label: 'Respuesta a esos tratamientos' },
      { tipo: 'largo', clave: 'presenciaOtrosMateriales', label: 'Presencia de otros materiales' },
      { tipo: 'largo', clave: 'secuelasTratamientosPrevios', label: 'Secuelas' },
    ],
  },
  {
    titulo: 'Examen corporal',
    campos: [
      {
        tipo: 'casillas',
        label: 'Hallazgos',
        opciones: [
          { clave: 'aranasVasculares', label: 'Arañas vasculares' },
          { clave: 'telangiectasias', label: 'Telangiectasias' },
          { clave: 'varices', label: 'Várices' },
          { clave: 'celulitis', label: 'Celulitis' },
          { clave: 'flacidez', label: 'Flacidez' },
          { clave: 'estrias', label: 'Estrías' },
        ],
      },
      { tipo: 'largo', clave: 'adiposidadLocalizada', label: 'Adiposidad localizada' },
    ],
  },
  {
    titulo: 'Medidas',
    campos: [
      { tipo: 'numero', clave: 'pesoActual', label: 'Peso actual (kg)', min: 0, paso: '0.1' },
      { tipo: 'numero', clave: 'pesoHabitual', label: 'Peso habitual (kg)', min: 0, paso: '0.1' },
      { tipo: 'numero', clave: 'imc', label: 'IMC', min: 0, paso: '0.1' },
      { tipo: 'numero', clave: 'perimetroCintura', label: 'Perímetro de cintura (cm)', min: 0, paso: '0.1' },
      {
        tipo: 'casillas',
        label: 'Registro',
        opciones: [{ clave: 'seTomaFotografia', label: 'Se toma fotografía clínica' }],
      },
    ],
  },
  DIAGNOSTICO,
]
