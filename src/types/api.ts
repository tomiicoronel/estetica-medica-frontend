/**
 * DTOs del backend Spring Boot.
 * Copiados literalmente de GUIA_FRONTEND.md — si algo no está acá, no existe
 * en la API. No agregar campos "por las dudas".
 */

export type UUID = string
export type LocalDate = string // "1990-05-20"
export type LocalDateTime = string // "2026-06-01T10:30:00"

export type RolUsuario = 'ADMIN' | 'PROFESIONAL' | 'PACIENTE'
export type EstadoTurno = 'PENDIENTE' | 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO'
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'MERCADO_PAGO' | 'TRUEQUE'
export type SeveridadMrs = 'NINGUNO_MINIMO' | 'LEVE' | 'MODERADO' | 'SEVERO'

/** Puntaje de un síntoma MRS: 0 = ninguno, 1 = leve, 2 = moderado, 3 = grave, 4 = extremadamente grave. */
export type PuntajeMrs = 0 | 1 | 2 | 3 | 4

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  tipoToken: 'Bearer'
  debeCambiarPassword: boolean
  rol: 'ADMIN' | 'PROFESIONAL'
}

export interface CambioPasswordRequest {
  passwordActual: string
  passwordNueva: string // mínimo 8 caracteres
}

/* -------------------------------------------------------------------------- */
/* Profesionales                                                               */
/* -------------------------------------------------------------------------- */

export interface CrearProfesionalRequest {
  nombre: string
  apellido: string
  email: string
  telefono: string
  especialidad?: string
  password: string // mínimo 8 caracteres
}

export interface EditarProfesionalRequest {
  nombre: string
  apellido: string
  email: string
  telefono: string
  especialidad?: string
}

export interface ResetearPasswordRequest {
  passwordNueva: string // mínimo 8 caracteres
}

export interface ProfesionalRequest {
  nombre: string
  apellido: string
  email: string
  telefono: string
  especialidad?: string
}

export interface ProfesionalResponse {
  id: UUID
  nombre: string
  apellido: string
  email: string
  telefono: string
  especialidad?: string
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Pacientes                                                                   */
/* -------------------------------------------------------------------------- */

export interface PacienteRequest {
  // profesionalId es legacy e ignorado por la API; no hace falta enviarlo.
  nombre: string
  apellido: string
  dniCuit: string
  fechaNacimiento?: LocalDate
  telefono: string
  email?: string
  profesion?: string
  domicilio?: string
  obraSocial?: string
  numeroObraSocial?: string
  contactoEmergenciaNombre?: string
  contactoEmergenciaTelefono?: string
  contactoEmergenciaParentesco?: string
  entidadTraslado1?: string
  entidadTraslado2?: string
}

export interface PacienteResponse extends PacienteRequest {
  id: UUID
  profesionalId: UUID
  activo: boolean
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Servicios                                                                   */
/* -------------------------------------------------------------------------- */

export interface ServicioRequest {
  nombre: string
  /** Obligatoria: el backend la valida con @NotBlank. */
  descripcion: string
  precio: number
}

export interface ServicioResponse {
  id: UUID
  profesionalId: UUID
  nombre: string
  descripcion?: string
  precio: number
  activo: boolean
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Turnos                                                                      */
/* -------------------------------------------------------------------------- */

export interface TurnoRequest {
  pacienteId: UUID
  fechaHora: LocalDateTime
  servicioIds: UUID[] // no puede estar vacío
  observaciones?: string
}

export interface TurnoServicioResponse {
  servicioId: UUID
  nombre: string
  precioMomento: number
}

export interface TurnoResponse {
  id: UUID
  profesionalId: UUID
  pacienteId: UUID
  fechaHora: LocalDateTime
  estado: EstadoTurno
  montoTotal: number
  observaciones?: string
  servicios: TurnoServicioResponse[]
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Sesiones clínicas                                                           */
/* -------------------------------------------------------------------------- */

export interface SesionClinicaRequest {
  tratamiento: string
  /** Obligatoria: el backend la valida con @NotBlank. */
  respuestaTolerancia: string
  observaciones?: string
}

export interface SesionClinicaResponse {
  id: UUID
  turnoId: UUID
  pacienteId: UUID
  profesionalId: UUID
  numeroSesion: number
  tratamiento: string
  respuestaTolerancia?: string
  observaciones?: string
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Historia clínica facial                                                     */
/* -------------------------------------------------------------------------- */

export interface HistoriaClinicaFacialRequest {
  hta?: boolean
  dbt?: boolean
  hipotiroidismo?: boolean
  hipertiroidismo?: boolean
  anemia?: boolean
  enfermedadesAutoinmunes?: boolean
  glaucoma?: boolean
  enfermedadNeuromuscular?: boolean
  trastornosCoagulacion?: boolean
  alteracionCicatrizacion?: boolean
  marcapasos?: boolean
  protesisMetalica?: boolean
  otroAntecedentePatologico?: string
  tbq?: boolean
  alcohol?: boolean
  otrasToxico?: string
  alergicoHuevo?: boolean
  alergicoAnestesia?: boolean
  alergicoFish?: boolean
  otrasAlergias?: string
  antecedentesQuirurgicos?: string
  fum?: string
  embarazo?: boolean
  herpesLabial?: boolean
  medicacionHabitual?: string
  aspirinaSemana?: boolean
  exposicionSolar?: boolean
  usaProteccionSolar?: boolean
  proteccionSolarCual?: string
  proteccionSolarVecesDia?: string
  habitosHigieneFacial?: string
  tratamientoDomiciliario?: string
  tratamientosPrevios?: boolean
  tratamientosPreviosCuales?: string
  tratamientosPreviosRespuesta?: string
  viajeProximoMes?: boolean
  presenciaOtrosMateriales?: string
  secuelasTratamientosPrevios?: string
  seTomaFotografia?: boolean
  fototipoFitzpatrick?: number // 1 a 6
  gradoGlogau?: number // 1 a 4
  diagnosticoYTratamiento?: string
  observacionesPosteriores?: string
}

export interface HistoriaClinicaFacialResponse extends HistoriaClinicaFacialRequest {
  id: UUID
  pacienteId: UUID
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Historia clínica corporal                                                   */
/* -------------------------------------------------------------------------- */

export interface HistoriaClinicaCorporalRequest {
  hta?: boolean
  dbt?: boolean
  hipotiroidismo?: boolean
  hipertiroidismo?: boolean
  anemia?: boolean
  enfermedadesAutoinmunes?: boolean
  glaucoma?: boolean
  enfermedadNeuromuscular?: boolean
  trastornosCoagulacion?: boolean
  alteracionCicatrizacion?: boolean
  marcapasos?: boolean
  protesisMetalica?: boolean
  cancer?: boolean
  otroAntecedentePatologico?: string
  tbq?: boolean
  alcohol?: boolean
  otrasToxico?: string
  alergicoHuevo?: boolean
  alergicoAnestesia?: boolean
  alergicoFish?: boolean
  otrasAlergias?: string
  antecedentesQuirurgicos?: string
  fum?: string
  embarazo?: boolean
  lactancia?: boolean
  herpesLabial?: boolean
  medicacionHabitual?: string
  aspirinaSemana?: boolean
  alimentacionSaludable?: boolean
  bebeAgua?: boolean
  sedentarismoGimnasia?: string
  ortostatismoProlongado?: boolean
  mediasCompresion?: boolean
  tratamientosPrevios?: boolean
  tratamientosPreviosCuales?: string
  tratamientosPreviosCuando?: string
  tratamientosPreviosRespuesta?: string
  viajeProximoMes?: boolean
  presenciaOtrosMateriales?: string
  secuelasTratamientosPrevios?: string
  aranasVasculares?: boolean
  telangiectasias?: boolean
  varices?: boolean
  celulitis?: boolean
  flacidez?: boolean
  estrias?: boolean
  adiposidadLocalizada?: string
  pesoActual?: number
  pesoHabitual?: number
  imc?: number
  perimetroCintura?: number
  seTomaFotografia?: boolean
  diagnosticoYTratamiento?: string
  observacionesPosteriores?: string
}

export interface HistoriaClinicaCorporalResponse extends HistoriaClinicaCorporalRequest {
  id: UUID
  pacienteId: UUID
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Ficha de menopausia (escala MRS)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Los 11 síntomas son obligatorios. Inicializar el formulario con los 11 en 0
 * (valor válido: "no procede/ninguno"), nunca en null, para no comerse un 400.
 * Los puntajes y severidades los calcula el backend: si se envían, se ignoran.
 */
export interface EvaluacionMenopausiaRequest {
  fechaEvaluacion?: LocalDate // si se omite, hoy en Argentina; no puede ser futura
  sofocosSudoracion: PuntajeMrs
  molestiasCardiacas: PuntajeMrs
  trastornosSueno: PuntajeMrs
  estadoAnimoDepresivo: PuntajeMrs
  irritabilidad: PuntajeMrs
  ansiedad: PuntajeMrs
  cansancioFisicoMental: PuntajeMrs
  problemasSexuales: PuntajeMrs
  problemasVejiga: PuntajeMrs
  sequedadVaginal: PuntajeMrs
  molestiasMuscularesArticulares: PuntajeMrs
  observaciones?: string
}

export interface EvaluacionMenopausiaResponse {
  id: UUID
  pacienteId: UUID
  fechaEvaluacion: LocalDate
  sofocosSudoracion: PuntajeMrs
  molestiasCardiacas: PuntajeMrs
  trastornosSueno: PuntajeMrs
  estadoAnimoDepresivo: PuntajeMrs
  irritabilidad: PuntajeMrs
  ansiedad: PuntajeMrs
  cansancioFisicoMental: PuntajeMrs
  problemasSexuales: PuntajeMrs
  problemasVejiga: PuntajeMrs
  sequedadVaginal: PuntajeMrs
  molestiasMuscularesArticulares: PuntajeMrs
  observaciones?: string
  // Calculados por el servidor, de solo lectura:
  puntajeSomatica: number // 0-16
  severidadSomatica: SeveridadMrs
  puntajePsicologica: number // 0-16
  severidadPsicologica: SeveridadMrs
  puntajeUrogenital: number // 0-12
  severidadUrogenital: SeveridadMrs
  puntajeTotal: number // 0-44
  severidadTotal: SeveridadMrs
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Fotos de evolución                                                          */
/* -------------------------------------------------------------------------- */

// La foto se sube como multipart/form-data (campo "file" + "descripcion"
// opcional), no como JSON. No existe FotoPacienteRequest.

export interface FotoPacienteResponse {
  id: UUID
  pacienteId: UUID
  sesionClinicaId: UUID
  rutaImagen: string // ruta lógica legada; el binario se baja por "url"
  url: string // "/api/fotos/{id}/contenido" (requiere header Authorization)
  contentType?: string
  nombreArchivo?: string
  tamanoBytes?: number
  fecha: LocalDateTime
  descripcion?: string
  creadoEn: LocalDateTime
}

export interface DiaFotosResumenResponse {
  fecha: string // yyyy-MM-dd
  cantidadFotos: number
}

/* -------------------------------------------------------------------------- */
/* Pagos                                                                       */
/* -------------------------------------------------------------------------- */

export interface PagoRequest {
  metodo: MetodoPago
  monto: number
  esSena?: boolean
  detalleTrueque?: string
  fecha?: LocalDateTime
}

export interface PagoResponse {
  id: UUID
  turnoId: UUID
  metodo: MetodoPago
  monto: number
  esSena: boolean
  esTrueque: boolean
  detalleTrueque?: string
  fecha: LocalDateTime
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

export interface ResumenPagoResponse {
  turnoId: UUID
  montoTotal: number
  montoPagado: number
  deuda: number
  tieneDeuda: boolean
  pagos: PagoResponse[]
}

export interface ResumenDiarioPagoResponse {
  fecha: string // yyyy-MM-dd
  totalRecaudado: number
  cantidadPagos: number
  pagos: PagoResponse[]
}

export interface DiaPagosResumenResponse {
  fecha: string // yyyy-MM-dd
  cantidadPagos: number
  totalRecaudado: number
}

/* -------------------------------------------------------------------------- */
/* Bloqueos de agenda                                                          */
/* -------------------------------------------------------------------------- */

export interface BloqueoAgendaRequest {
  fechaInicio: LocalDateTime
  fechaFin: LocalDateTime
  motivo?: string
}

export interface BloqueoAgendaResponse extends BloqueoAgendaRequest {
  id: UUID
  profesionalId: UUID
  creadoEn: LocalDateTime
  actualizadoEn: LocalDateTime
}

/* -------------------------------------------------------------------------- */
/* Dashboard y utilitarios                                                     */
/* -------------------------------------------------------------------------- */

export interface DashboardResponse {
  fecha: string // yyyy-MM-dd
  cantidadTurnos: number
  cantidadTurnosRealizados: number
  pacientesActivos: number // total, no depende de la fecha
  totalRecaudado: number
}

/** Envoltorio genérico de todos los endpoints paginados (`.../pagina`). */
export interface PageResponse<T> {
  contenido: T[]
  pagina: number // página actual (empieza en 0)
  tamano: number // elementos por página
  totalElementos: number
  totalPaginas: number
  primera: boolean
  ultima: boolean
}

export interface ErrorResponse {
  timestamp: LocalDateTime
  status: number
  error: string
  mensaje: string
}

export interface ValidationErrorResponse {
  timestamp: LocalDateTime
  status: number
  error: string
  mensajes: Record<string, string>
}
