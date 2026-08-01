# Guía para conectar el frontend con este backend

Esta guía resume cómo consumir toda la API desde un frontend, especialmente desde una app React/Vite corriendo en `http://localhost:5173`.

## Configuración base

- **Backend local:** `http://localhost:8080`
- **Frontend permitido por CORS:** `http://localhost:5173`
- **Formato:** JSON
- **Fechas:** ISO string, por ejemplo `2026-06-01T10:30:00`
- **IDs:** UUID como string
- **Montos:** número decimal, por ejemplo `50000.00`
- **Auth:** JWT en header `Authorization: Bearer <token>`

El backend no permite cualquier origen por CORS. Si el frontend corre en otro puerto u origen, hay que actualizar `SecurityConfig`.

## Reglas globales de seguridad

1. `POST /api/auth/login` es público.
2. Swagger/OpenAPI es público: `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs/**`.
3. El resto de endpoints requiere token JWT.
4. Los endpoints `/api/admin/**` requieren rol `ADMIN`.
5. Las cuentas `PROFESIONAL` no pueden acceder a `/api/admin/**`.
6. No existe registro público de profesionales. Las cuentas se crean desde administración.
7. Toda cuenta creada inicialmente queda con `debeCambiarPassword=true`.
8. Mientras `debeCambiarPassword=true`, el backend bloquea todos los endpoints protegidos excepto:
   - `POST /api/auth/login`
   - `POST /api/auth/cambiar-password`
   - `POST /api/auth/logout` si se agrega en el futuro

## Flujo de autenticación recomendado

### Login

`POST /api/auth/login`

Request:

```json
{
  "email": "admin@estetica.local",
  "password": "Password123!"
}
```

Response:

```json
{
  "token": "jwt...",
  "tipoToken": "Bearer",
  "debeCambiarPassword": true,
  "rol": "ADMIN"
}
```

Guardar en el frontend:

- `token`
- `rol`
- `debeCambiarPassword`

### Decisión después del login

- Si `debeCambiarPassword === true`, redirigir siempre a la pantalla de cambio de contraseña.
- Si `debeCambiarPassword === false` y `rol === "ADMIN"`, mostrar panel de administración.
- Si `debeCambiarPassword === false` y `rol === "PROFESIONAL"`, mostrar la app de gestión profesional.

### Cambio obligatorio de contraseña

`POST /api/auth/cambiar-password`

Headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "passwordActual": "Password123!",
  "passwordNueva": "NuevaPassword123!"
}
```

Response: `204 No Content`

Después de un `204`, el frontend puede marcar localmente `debeCambiarPassword=false` o volver a hacer login para refrescar el estado. El backend consulta la base en cada request, así que el token actual queda habilitado apenas se guarda el cambio.

## Manejo de errores

Error común:

```json
{
  "timestamp": "2026-05-31T17:00:00",
  "status": 403,
  "error": "Acceso denegado",
  "mensaje": "No tenés permisos para acceder a este recurso."
}
```

Error de validación:

```json
{
  "timestamp": "2026-05-31T17:00:00",
  "status": 400,
  "error": "Error de validación",
  "mensajes": {
    "email": "El email debe tener un formato válido",
    "password": "La contraseña debe tener al menos 8 caracteres"
  }
}
```

Casos importantes para el frontend:

- `401`: token ausente, inválido o vencido. Cerrar sesión y volver a login.
- `403` con mensaje `Debe cambiar su contraseña inicial antes de usar el sistema`: redirigir a cambiar contraseña.
- `403` con mensaje de permisos: mostrar acceso denegado.
- `404` en recursos ajenos: puede significar que el recurso no existe o que pertenece a otra profesional. No mostrar datos de otros tenants.
- `400`: mostrar errores de formulario.

## Cliente HTTP sugerido

```ts
const API_URL = "http://localhost:8080";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw data ?? { status: response.status, mensaje: "Error inesperado" };
  }

  return data as T;
}
```

## Paginación

Los listados que pueden crecer tienen una variante paginada en `.../pagina` que devuelve un `PageResponse<T>` (ver DTOs). Los endpoints de lista completa originales se mantienen para compatibilidad.

- Parámetros comunes: `page` (empieza en 0, default `0`) y `size` (default `5`).
- La respuesta trae `contenido` (los ítems de la página), `pagina`, `tamano`, `totalElementos`, `totalPaginas`, `primera` y `ultima`.
- Variantes disponibles: `GET /api/pacientes/pagina`, `GET /api/turnos/pagina`, `GET /api/pagos/pagina`, `GET /api/pacientes/{id}/fotos/pagina`, `GET /api/pacientes/{id}/evaluaciones-menopausia/pagina`.

Además hay endpoints de "resumen por día" para armar vistas de dos niveles (elegir un día → ver su detalle paginado): `GET /api/pagos/por-dia` y `GET /api/pacientes/{id}/fotos/por-dia`.

## Endpoints disponibles

### Auth

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/auth/login` | `LoginRequest` | `AuthResponse` | Público |
| POST | `/api/auth/cambiar-password` | `CambioPasswordRequest` | 204 | Autenticado |

### Administración

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/admin/profesionales` | `CrearProfesionalRequest` | `ProfesionalResponse` | ADMIN |
| GET | `/api/admin/profesionales` | - | `ProfesionalResponse[]` | ADMIN |
| PUT | `/api/admin/profesionales/{id}` | `EditarProfesionalRequest` | `ProfesionalResponse` | ADMIN |
| POST | `/api/admin/profesionales/{id}/resetear-password` | `ResetearPasswordRequest` | 204 | ADMIN |
| DELETE | `/api/admin/profesionales/{id}` | - | 204 | ADMIN |

### Perfil profesional

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| GET | `/api/profesionales/me` | - | `ProfesionalResponse` | Autenticado |
| PUT | `/api/profesionales/me` | `ProfesionalRequest` | `ProfesionalResponse` | Autenticado |

### Pacientes

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/pacientes` | `PacienteRequest` | `PacienteResponse` | Autenticado |
| GET | `/api/pacientes` | - | `PacienteResponse[]` | Autenticado |
| GET | `/api/pacientes/pagina?page=0&size=5&activo=true` | - | `PageResponse<PacienteResponse>` | Autenticado |
| GET | `/api/pacientes/activos` | - | `PacienteResponse[]` | Autenticado |
| GET | `/api/pacientes/{id}` | - | `PacienteResponse` | Autenticado |
| PUT | `/api/pacientes/{id}` | `PacienteRequest` | `PacienteResponse` | Autenticado |
| PATCH | `/api/pacientes/{id}/estado?activo=true` | - | texto | Autenticado |
| DELETE | `/api/pacientes/{id}/eliminar` | - | 204 | Autenticado |

`GET /api/pacientes/pagina` devuelve los pacientes de a páginas (por defecto `size=5`), ordenados por apellido y nombre, dentro de un `PageResponse<PacienteResponse>` (ver sección "Paginación"). El parámetro `activo` es opcional: si se omite trae activos y archivados; `true`/`false` filtra por estado. Los endpoints `GET /api/pacientes` y `GET /api/pacientes/activos` (lista completa) siguen disponibles.

`DELETE /api/pacientes/{id}/eliminar` realiza borrado físico definitivo y está separado de la baja lógica (`PATCH /api/pacientes/{id}/estado?activo=false`). Solo permite eliminar pacientes propios de la profesional autenticada y completamente vacíos, sin historia clínica facial, historia clínica corporal, evaluaciones de menopausia, turnos, pagos, sesiones clínicas ni fotos asociadas. Si el paciente no pertenece a la profesional autenticada devuelve 404. Si tiene cualquier dato asociado devuelve 409 con `ErrorResponse` y el mensaje: `No se puede eliminar un paciente con datos asociados (turnos, pagos, historias clínicas, evaluaciones de menopausia, sesiones o fotos). Archivalo en su lugar.`

### Servicios

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/servicios` | `ServicioRequest` | `ServicioResponse` | Autenticado |
| GET | `/api/servicios` | - | `ServicioResponse[]` | Autenticado |
| GET | `/api/servicios/activos` | - | `ServicioResponse[]` | Autenticado |
| GET | `/api/servicios/{id}` | - | `ServicioResponse` | Autenticado |
| PUT | `/api/servicios/{id}` | `ServicioRequest` | `ServicioResponse` | Autenticado |
| PATCH | `/api/servicios/{id}/estado?activo=false` | - | texto | Autenticado |
| PATCH | `/api/servicios/{id}/precio?nuevoPrecio=60000.00` | - | texto | Autenticado |

No hay delete físico de servicios. Se activan/desactivan.

### Turnos

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/turnos` | `TurnoRequest` | `TurnoResponse` | Autenticado |
| GET | `/api/turnos` | - | `TurnoResponse[]` | Autenticado |
| GET | `/api/turnos?estado=PENDIENTE` | - | `TurnoResponse[]` | Autenticado |
| GET | `/api/turnos?desde=2026-06-01T00:00:00&hasta=2026-06-30T23:59:59` | - | `TurnoResponse[]` | Autenticado |
| GET | `/api/turnos/pagina?page=0&size=5&estado=&fecha=&desde=&hasta=` | - | `PageResponse<TurnoResponse>` | Autenticado |
| GET | `/api/turnos/proximos` | - | `TurnoResponse[]` | Autenticado |
| GET | `/api/turnos/proximos?fecha=2026-06-05` | - | `TurnoResponse[]` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/turnos` | - | `TurnoResponse[]` | Autenticado |
| GET | `/api/turnos/{id}` | - | `TurnoResponse` | Autenticado |
| PATCH | `/api/turnos/{id}/estado?nuevoEstado=REALIZADO` | - | `TurnoResponse` | Autenticado |

Estados válidos: `PENDIENTE`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`.

`GET /api/turnos/proximos` devuelve **todos** los turnos de un día (sin límite de cantidad). Con `fecha` devuelve los turnos de esa fecha; sin `fecha` devuelve los turnos del próximo día (a partir de hoy) que tenga turnos, o `[]` si no hay turnos futuros. Ideal para el panel de "próximos turnos" del dashboard.

`GET /api/turnos/pagina` devuelve la agenda paginada (por defecto `size=5`), ordenada por `fechaHora` descendente, dentro de un `PageResponse<TurnoResponse>`. Todos los filtros son opcionales y combinables:

- `estado`: filtra por estado (`PENDIENTE`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`).
- `fecha` (`yyyy-MM-dd`): **turnos de ese día** (ideal para "turnos del día"). Si se envía, se ignoran `desde`/`hasta`.
- `desde`/`hasta` (`LocalDateTime`): **rango histórico** (para ver turnos pasados de un período).

Ejemplos: turnos de hoy → `?fecha=2026-06-05`; pendientes de hoy → `?fecha=2026-06-05&estado=PENDIENTE`; pasados de un mes → `?desde=2026-05-01T00:00:00&hasta=2026-06-01T00:00:00`.

### Dashboard

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| GET | `/api/dashboard` | - | `DashboardResponse` | Autenticado |
| GET | `/api/dashboard?fecha=2026-06-05` | - | `DashboardResponse` | Autenticado |

Devuelve las métricas de la profesional autenticada para la fecha indicada. Si se omite `fecha`, usa el día actual en zona horaria de Argentina (`America/Argentina/Buenos_Aires`). Incluye turnos del día, turnos realizados del día, total de pacientes activos (no depende de la fecha) y total recaudado del día. Respeta el aislamiento por profesional.

### Historia clínica facial

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/pacientes/{pacienteId}/historia-clinica-facial` | `HistoriaClinicaFacialRequest` | `HistoriaClinicaFacialResponse` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/historia-clinica-facial` | - | `HistoriaClinicaFacialResponse` | Autenticado |
| PUT | `/api/historia-clinica-facial/{id}` | `HistoriaClinicaFacialRequest` | `HistoriaClinicaFacialResponse` | Autenticado |

### Historia clínica corporal

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/pacientes/{pacienteId}/historia-clinica-corporal` | `HistoriaClinicaCorporalRequest` | `HistoriaClinicaCorporalResponse` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/historia-clinica-corporal` | - | `HistoriaClinicaCorporalResponse` | Autenticado |
| PUT | `/api/historia-clinica-corporal/{id}` | `HistoriaClinicaCorporalRequest` | `HistoriaClinicaCorporalResponse` | Autenticado |

### Ficha de menopausia (escala MRS)

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/pacientes/{pacienteId}/evaluaciones-menopausia` | `EvaluacionMenopausiaRequest` | `EvaluacionMenopausiaResponse` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/evaluaciones-menopausia` | - | `EvaluacionMenopausiaResponse[]` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/evaluaciones-menopausia/pagina?page=0&size=5` | - | `PageResponse<EvaluacionMenopausiaResponse>` | Autenticado |
| GET | `/api/evaluaciones-menopausia/{id}` | - | `EvaluacionMenopausiaResponse` | Autenticado |
| PUT | `/api/evaluaciones-menopausia/{id}` | `EvaluacionMenopausiaRequest` | `EvaluacionMenopausiaResponse` | Autenticado |
| DELETE | `/api/evaluaciones-menopausia/{id}` | - | 204 | Autenticado |

**A diferencia de las historias clínicas facial y corporal, que son únicas por paciente, un paciente puede tener muchas evaluaciones MRS.** Crear una segunda evaluación devuelve 201, no 409: cada toma es un registro independiente y el objetivo es seguir la evolución entre fechas. El listado viene ordenado de la más reciente a la más antigua.

Los 11 síntomas son **obligatorios** y se puntúan de 0 a 4 (`0` = no procede/ninguno, `1` = leve, `2` = moderado, `3` = grave, `4` = extremadamente grave). Si falta alguno o queda fuera de rango, la respuesta es 400 con `ValidationErrorResponse`.

`fechaEvaluacion` es opcional: si se omite, el backend usa la fecha de hoy en `America/Argentina/Buenos_Aires`. No puede ser futura (400 con `ErrorResponse`). Es editable en el `PUT`, para poder cargar tomas retroactivas o corregir la fecha.

**Los 4 puntajes y las 4 severidades los calcula el servidor y son de solo lectura**: si vienen en el body del request se ignoran. Composición de las subescalas:

| Escala | Síntomas | Rango |
|---|---|---|
| Somática | 1 (sofocos), 2 (cardíacas), 3 (sueño), 11 (musculares) | 0-16 |
| Psicológica | 4 (depresivo), 5 (irritabilidad), 6 (ansiedad), 7 (cansancio) | 0-16 |
| Urogenital | 8 (sexuales), 9 (vejiga), 10 (sequedad) | 0-12 |
| Total | los 11 | 0-44 |

Puntos de corte de severidad (útiles para mostrar leyendas o colorear en el front, aunque el backend ya devuelve la clasificación resuelta):

| Escala | `NINGUNO_MINIMO` | `LEVE` | `MODERADO` | `SEVERO` |
|---|---|---|---|---|
| Total (0-44) | 0-4 | 5-8 | 9-15 | 16 o más |
| Somática (0-16) | 0-2 | 3-4 | 5-8 | 9 o más |
| Psicológica (0-16) | 0-1 | 2-3 | 4-6 | 7 o más |
| Urogenital (0-12) | 0 | 1 | 2-3 | 4 o más |

### Sesiones clínicas

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/turnos/{turnoId}/sesion-clinica` | `SesionClinicaRequest` | `SesionClinicaResponse` | Autenticado |
| GET | `/api/turnos/{turnoId}/sesion-clinica` | - | `SesionClinicaResponse` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/sesiones-clinicas` | - | `SesionClinicaResponse[]` | Autenticado |
| PUT | `/api/sesiones-clinicas/{id}` | `SesionClinicaRequest` | `SesionClinicaResponse` | Autenticado |

### Fotos de evolución

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/sesiones-clinicas/{sesionId}/fotos` | `multipart/form-data` (`file`, `descripcion?`) | `FotoPacienteResponse` | Autenticado |
| GET | `/api/fotos/{id}/contenido` | - | bytes de la imagen (`image/*`) | Autenticado |
| GET | `/api/pacientes/{pacienteId}/fotos` | - | `FotoPacienteResponse[]` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/fotos/pagina?page=0&size=5&fecha=` | - | `PageResponse<FotoPacienteResponse>` | Autenticado |
| GET | `/api/pacientes/{pacienteId}/fotos/por-dia` | - | `DiaFotosResumenResponse[]` | Autenticado |
| GET | `/api/sesiones-clinicas/{sesionId}/fotos` | - | `FotoPacienteResponse[]` | Autenticado |
| DELETE | `/api/fotos/{id}` | - | 204 | Autenticado |

**Subida real de imágenes.** Desde esta versión la foto se sube como archivo binario real (multipart) y se guarda en la base de datos. Se aceptan `image/jpeg`, `image/png`, `image/webp` y `image/heic/heif`, con un máximo de **15 MB** por archivo (si se supera, `400`). Ya no se envía un JSON con `sesionClinicaId`; se envía el archivo en el campo `file`.

Subir una foto (el `Content-Type` lo pone el navegador solo al usar `FormData`, **no** lo setees a mano):

```ts
async function subirFoto(sesionId: UUID, file: File, descripcion?: string) {
  const form = new FormData();
  form.append("file", file);
  if (descripcion) form.append("descripcion", descripcion);

  const token = localStorage.getItem("token");
  const res = await fetch(
    `http://localhost:8080/api/sesiones-clinicas/${sesionId}/fotos`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw await res.json();
  return (await res.json()) as FotoPacienteResponse;
}
```

**Mostrar la imagen.** El endpoint `GET /api/fotos/{id}/contenido` requiere el header `Authorization`, por lo que **un `<img src="/api/fotos/{id}/contenido">` directo no funciona** (el navegador no manda el token). Hay que descargar el binario con el token y crear un object URL:

```ts
async function urlDeFoto(fotoId: UUID): Promise<string> {
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:8080/api/fotos/${fotoId}/contenido`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const blob = await res.blob();
  return URL.createObjectURL(blob); // usar como src del <img>; liberar con URL.revokeObjectURL al desmontar
}
```

Cada `FotoPacienteResponse` ya trae el campo `url` (`/api/fotos/{id}/contenido`) para construir esa llamada.

**Galería de evolución dividida por días.** Para la vista de evolución:

1. `GET /api/pacientes/{pacienteId}/fotos/por-dia` → lista de días con fotos (`fecha`, `cantidadFotos`), de más reciente a más antiguo.
2. Al entrar a un día, `GET /api/pacientes/{pacienteId}/fotos/pagina?fecha=2026-06-05&page=0&size=5` → fotos de ese día paginadas (5 por página).

Sin `fecha`, `.../fotos/pagina` pagina todas las fotos del paciente.

### Pagos

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/turnos/{turnoId}/pagos` | `PagoRequest` | `PagoResponse` | Autenticado |
| GET | `/api/turnos/{turnoId}/pagos` | - | `PagoResponse[]` | Autenticado |
| GET | `/api/turnos/{turnoId}/pagos/resumen` | - | `ResumenPagoResponse` | Autenticado |
| GET | `/api/pagos` | - | `PagoResponse[]` | Autenticado |
| GET | `/api/pagos/pagina?page=0&size=5&fecha=` | - | `PageResponse<PagoResponse>` | Autenticado |
| GET | `/api/pagos/por-dia` | - | `DiaPagosResumenResponse[]` | Autenticado |
| GET | `/api/pagos/resumen-diario?fecha=2026-06-05` | - | `ResumenDiarioPagoResponse` | Autenticado |
| DELETE | `/api/pagos/{id}` | - | 204 | Autenticado |

Métodos de pago válidos: `EFECTIVO`, `TRANSFERENCIA`, `MERCADO_PAGO`, `TRUEQUE`.

`GET /api/pagos/resumen-diario?fecha=2026-06-05` devuelve, para la profesional autenticada, solo los pagos cuya `fecha` cae dentro del día consultado y el total recaudado de ese día. Si se omite `fecha`, usa el día actual en zona horaria de Argentina (`America/Argentina/Buenos_Aires`). El filtro toma el rango completo del día local: desde `00:00:00` inclusive hasta el inicio del día siguiente exclusivo, por lo que un pago a las `2026-06-05T16:10:00` cuenta para `2026-06-05`. La respuesta `ResumenDiarioPagoResponse` incluye `fecha`, `totalRecaudado` (`BigDecimal`), `cantidadPagos` y `pagos`. `GET /api/pagos` sigue devolviendo todos los pagos históricos para reportes generales.

**Vista de pagos por día (recomendada).** Para no mostrar una lista interminable de pagos:

1. `GET /api/pagos/por-dia` → lista de días con pagos (`fecha`, `cantidadPagos`, `totalRecaudado`), de más reciente a más antiguo. Es la pantalla de nivel superior.
2. Al entrar a un día, `GET /api/pagos/pagina?fecha=2026-06-05&page=0&size=5` → pagos de ese día paginados (5 por página).

`GET /api/pagos/pagina` sin `fecha` pagina todos los pagos (más reciente primero). El **total recaudado del día** sale de `totalRecaudado` en `/api/pagos/por-dia` o `/api/pagos/resumen-diario`; **no** se debe sumar `GET /api/pagos` (histórico completo).

### Bloqueos de agenda

| Método | Path | Body | Respuesta | Acceso |
|---|---|---|---|---|
| POST | `/api/bloqueos-agenda` | `BloqueoAgendaRequest` | `BloqueoAgendaResponse` | Autenticado |
| GET | `/api/bloqueos-agenda` | - | `BloqueoAgendaResponse[]` | Autenticado |
| GET | `/api/bloqueos-agenda/{id}` | - | `BloqueoAgendaResponse` | Autenticado |
| PUT | `/api/bloqueos-agenda/{id}` | `BloqueoAgendaRequest` | `BloqueoAgendaResponse` | Autenticado |
| DELETE | `/api/bloqueos-agenda/{id}` | - | 204 | Autenticado |

## DTOs principales para TypeScript

```ts
type UUID = string;
type LocalDate = string; // "1990-05-20"
type LocalDateTime = string; // "2026-06-01T10:30:00"
type RolUsuario = "ADMIN" | "PROFESIONAL" | "PACIENTE";
type EstadoTurno = "PENDIENTE" | "CONFIRMADO" | "REALIZADO" | "CANCELADO";
type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "MERCADO_PAGO" | "TRUEQUE";
type SeveridadMrs = "NINGUNO_MINIMO" | "LEVE" | "MODERADO" | "SEVERO";
/** Puntaje de un síntoma de la escala MRS: 0 = ninguno, 1 = leve, 2 = moderado, 3 = grave, 4 = extremadamente grave. */
type PuntajeMrs = 0 | 1 | 2 | 3 | 4;

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  tipoToken: "Bearer";
  debeCambiarPassword: boolean;
  rol: "ADMIN" | "PROFESIONAL";
}

interface CambioPasswordRequest {
  passwordActual: string;
  passwordNueva: string; // minimo 8 caracteres
}

interface CrearProfesionalRequest {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  especialidad?: string;
  password: string; // minimo 8 caracteres
}

interface EditarProfesionalRequest {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  especialidad?: string;
}

interface ResetearPasswordRequest {
  passwordNueva: string; // minimo 8 caracteres
}

interface ProfesionalRequest {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  especialidad?: string;
}

interface ProfesionalResponse {
  id: UUID;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  especialidad?: string;
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

interface PacienteRequest {
  // profesionalId es legacy e ignorado por la API; no hace falta enviarlo.
  nombre: string;
  apellido: string;
  dniCuit: string;
  fechaNacimiento?: LocalDate;
  telefono: string;
  email?: string;
  profesion?: string;
  domicilio?: string;
  obraSocial?: string;
  numeroObraSocial?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
  entidadTraslado1?: string;
  entidadTraslado2?: string;
}

interface PacienteResponse extends PacienteRequest {
  id: UUID;
  profesionalId: UUID;
  activo: boolean;
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

interface ServicioRequest {
  nombre: string;
  descripcion: string; // obligatoria (@NotBlank)
  precio: number;
}

interface ServicioResponse {
  id: UUID;
  profesionalId: UUID;
  nombre: string;
  descripcion?: string;
  precio: number;
  activo: boolean;
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

interface TurnoRequest {
  pacienteId: UUID;
  fechaHora: LocalDateTime;
  servicioIds: UUID[];
  observaciones?: string;
}

interface TurnoServicioResponse {
  servicioId: UUID;
  nombre: string;
  precioMomento: number;
}

interface TurnoResponse {
  id: UUID;
  profesionalId: UUID;
  pacienteId: UUID;
  fechaHora: LocalDateTime;
  estado: EstadoTurno;
  montoTotal: number;
  observaciones?: string;
  servicios: TurnoServicioResponse[];
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

interface SesionClinicaRequest {
  tratamiento: string;
  respuestaTolerancia: string; // obligatoria (@NotBlank)
  observaciones?: string;
}

interface SesionClinicaResponse {
  id: UUID;
  turnoId: UUID;
  pacienteId: UUID;
  profesionalId: UUID;
  numeroSesion: number;
  tratamiento: string;
  respuestaTolerancia?: string;
  observaciones?: string;
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

// Ficha de menopausia (escala MRS). Los 11 síntomas son obligatorios.
// No incluye puntajes ni severidades: los calcula el backend y se ignoran si se envían.
interface EvaluacionMenopausiaRequest {
  fechaEvaluacion?: LocalDate; // si se omite, hoy en Argentina; no puede ser futura
  sofocosSudoracion: PuntajeMrs;
  molestiasCardiacas: PuntajeMrs;
  trastornosSueno: PuntajeMrs;
  estadoAnimoDepresivo: PuntajeMrs;
  irritabilidad: PuntajeMrs;
  ansiedad: PuntajeMrs;
  cansancioFisicoMental: PuntajeMrs;
  problemasSexuales: PuntajeMrs;
  problemasVejiga: PuntajeMrs;
  sequedadVaginal: PuntajeMrs;
  molestiasMuscularesArticulares: PuntajeMrs;
  observaciones?: string;
}

interface EvaluacionMenopausiaResponse {
  id: UUID;
  pacienteId: UUID;
  fechaEvaluacion: LocalDate;
  sofocosSudoracion: PuntajeMrs;
  molestiasCardiacas: PuntajeMrs;
  trastornosSueno: PuntajeMrs;
  estadoAnimoDepresivo: PuntajeMrs;
  irritabilidad: PuntajeMrs;
  ansiedad: PuntajeMrs;
  cansancioFisicoMental: PuntajeMrs;
  problemasSexuales: PuntajeMrs;
  problemasVejiga: PuntajeMrs;
  sequedadVaginal: PuntajeMrs;
  molestiasMuscularesArticulares: PuntajeMrs;
  observaciones?: string;
  // Calculados por el servidor, de solo lectura:
  puntajeSomatica: number;      // 0-16
  severidadSomatica: SeveridadMrs;
  puntajePsicologica: number;   // 0-16
  severidadPsicologica: SeveridadMrs;
  puntajeUrogenital: number;    // 0-12
  severidadUrogenital: SeveridadMrs;
  puntajeTotal: number;         // 0-44
  severidadTotal: SeveridadMrs;
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

// La foto se sube como multipart/form-data (campo "file" + "descripcion" opcional),
// no como JSON. Ya no existe FotoPacienteRequest.

interface FotoPacienteResponse {
  id: UUID;
  pacienteId: UUID;
  sesionClinicaId: UUID;
  rutaImagen: string;        // ruta lógica legada; el binario se baja por "url"
  url: string;              // "/api/fotos/{id}/contenido" (requiere header Authorization)
  contentType?: string;      // "image/jpeg", etc.
  nombreArchivo?: string;
  tamanoBytes?: number;
  fecha: LocalDateTime;
  descripcion?: string;
  creadoEn: LocalDateTime;
}

interface DiaFotosResumenResponse {
  fecha: string;             // yyyy-MM-dd
  cantidadFotos: number;
}

interface PagoRequest {
  metodo: MetodoPago;
  monto: number;
  esSena?: boolean;
  detalleTrueque?: string;
  fecha?: LocalDateTime;
}

interface PagoResponse {
  id: UUID;
  turnoId: UUID;
  metodo: MetodoPago;
  monto: number;
  esSena: boolean;
  esTrueque: boolean;
  detalleTrueque?: string;
  fecha: LocalDateTime;
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

interface ResumenPagoResponse {
  turnoId: UUID;
  montoTotal: number;
  montoPagado: number;
  deuda: number;
  tieneDeuda: boolean;
  pagos: PagoResponse[];
}

interface ResumenDiarioPagoResponse {
  fecha: string;          // yyyy-MM-dd
  totalRecaudado: number;
  cantidadPagos: number;
  pagos: PagoResponse[];
}

interface DiaPagosResumenResponse {
  fecha: string;          // yyyy-MM-dd
  cantidadPagos: number;
  totalRecaudado: number;
}

// Envoltorio genérico de todos los endpoints paginados (`.../pagina`).
interface PageResponse<T> {
  contenido: T[];
  pagina: number;         // página actual (empieza en 0)
  tamano: number;         // elementos por página
  totalElementos: number;
  totalPaginas: number;
  primera: boolean;
  ultima: boolean;
}

interface DashboardResponse {
  fecha: string;                    // yyyy-MM-dd
  cantidadTurnos: number;
  cantidadTurnosRealizados: number;
  pacientesActivos: number;         // total, no depende de la fecha
  totalRecaudado: number;
}

interface BloqueoAgendaRequest {
  fechaInicio: LocalDateTime;
  fechaFin: LocalDateTime;
  motivo?: string;
}

interface BloqueoAgendaResponse extends BloqueoAgendaRequest {
  id: UUID;
  profesionalId: UUID;
  creadoEn: LocalDateTime;
  actualizadoEn: LocalDateTime;
}

interface ErrorResponse {
  timestamp: LocalDateTime;
  status: number;
  error: string;
  mensaje: string;
}

interface ValidationErrorResponse {
  timestamp: LocalDateTime;
  status: number;
  error: string;
  mensajes: Record<string, string>;
}
```

## Campos de historia clínica facial

`HistoriaClinicaFacialRequest` y `HistoriaClinicaFacialResponse` usan los mismos campos; la response además incluye `id`, `pacienteId`, `creadoEn` y `actualizadoEn`.

Campos disponibles:

```ts
interface HistoriaClinicaFacialRequest {
  hta?: boolean;
  dbt?: boolean;
  hipotiroidismo?: boolean;
  hipertiroidismo?: boolean;
  anemia?: boolean;
  enfermedadesAutoinmunes?: boolean;
  glaucoma?: boolean;
  enfermedadNeuromuscular?: boolean;
  trastornosCoagulacion?: boolean;
  alteracionCicatrizacion?: boolean;
  marcapasos?: boolean;
  protesisMetalica?: boolean;
  otroAntecedentePatologico?: string;
  tbq?: boolean;
  alcohol?: boolean;
  otrasToxico?: string;
  alergicoHuevo?: boolean;
  alergicoAnestesia?: boolean;
  alergicoFish?: boolean;
  otrasAlergias?: string;
  antecedentesQuirurgicos?: string;
  fum?: string;
  embarazo?: boolean;
  herpesLabial?: boolean;
  medicacionHabitual?: string;
  aspirinaSemana?: boolean;
  exposicionSolar?: boolean;
  usaProteccionSolar?: boolean;
  proteccionSolarCual?: string;
  proteccionSolarVecesDia?: string;
  habitosHigieneFacial?: string;
  tratamientoDomiciliario?: string;
  tratamientosPrevios?: boolean;
  tratamientosPreviosCuales?: string;
  tratamientosPreviosRespuesta?: string;
  viajeProximoMes?: boolean;
  presenciaOtrosMateriales?: string;
  secuelasTratamientosPrevios?: string;
  seTomaFotografia?: boolean;
  fototipoFitzpatrick?: number; // 1 a 6
  gradoGlogau?: number; // 1 a 4
  diagnosticoYTratamiento?: string;
  observacionesPosteriores?: string;
}
```

## Campos de historia clínica corporal

`HistoriaClinicaCorporalRequest` y `HistoriaClinicaCorporalResponse` usan los mismos campos; la response además incluye `id`, `pacienteId`, `creadoEn` y `actualizadoEn`.

Campos disponibles:

```ts
interface HistoriaClinicaCorporalRequest {
  hta?: boolean;
  dbt?: boolean;
  hipotiroidismo?: boolean;
  hipertiroidismo?: boolean;
  anemia?: boolean;
  enfermedadesAutoinmunes?: boolean;
  glaucoma?: boolean;
  enfermedadNeuromuscular?: boolean;
  trastornosCoagulacion?: boolean;
  alteracionCicatrizacion?: boolean;
  marcapasos?: boolean;
  protesisMetalica?: boolean;
  cancer?: boolean;
  otroAntecedentePatologico?: string;
  tbq?: boolean;
  alcohol?: boolean;
  otrasToxico?: string;
  alergicoHuevo?: boolean;
  alergicoAnestesia?: boolean;
  alergicoFish?: boolean;
  otrasAlergias?: string;
  antecedentesQuirurgicos?: string;
  fum?: string;
  embarazo?: boolean;
  lactancia?: boolean;
  herpesLabial?: boolean;
  medicacionHabitual?: string;
  aspirinaSemana?: boolean;
  alimentacionSaludable?: boolean;
  bebeAgua?: boolean;
  sedentarismoGimnasia?: string;
  ortostatismoProlongado?: boolean;
  mediasCompresion?: boolean;
  tratamientosPrevios?: boolean;
  tratamientosPreviosCuales?: string;
  tratamientosPreviosCuando?: string;
  tratamientosPreviosRespuesta?: string;
  viajeProximoMes?: boolean;
  presenciaOtrosMateriales?: string;
  secuelasTratamientosPrevios?: string;
  aranasVasculares?: boolean;
  telangiectasias?: boolean;
  varices?: boolean;
  celulitis?: boolean;
  flacidez?: boolean;
  estrias?: boolean;
  adiposidadLocalizada?: string;
  pesoActual?: number;
  pesoHabitual?: number;
  imc?: number;
  perimetroCintura?: number;
  seTomaFotografia?: boolean;
  diagnosticoYTratamiento?: string;
  observacionesPosteriores?: string;
}
```

## Pantallas recomendadas para el frontend

### Públicas

- Login.

### Autenticadas comunes

- Cambio obligatorio de contraseña.
- Perfil profesional.

### ADMIN

- Dashboard admin.
- Listado de profesionales.
- Crear profesional.
- Editar profesional.
- Resetear contraseña de profesional.
- Dar de baja profesional.

### PROFESIONAL

- Dashboard profesional.
- Pacientes.
- Detalle de paciente.
- Historia clínica facial.
- Historia clínica corporal.
- Servicios.
- Agenda/turnos.
- Sesiones clínicas.
- Fotos de evolución.
- Pagos y resumen de deuda.
- Bloqueos de agenda.

## Flujos clave que el frontend debe respetar

### Primer ingreso del ADMIN

1. Login con `admin@estetica.local`.
2. Si `debeCambiarPassword=true`, mostrar pantalla de cambio de contraseña.
3. Después del cambio, mostrar panel admin.
4. Desde admin, gestionar profesionales: crear, listar, editar, resetear contraseña o dar de baja.

### Alta de una profesional

1. ADMIN llama `POST /api/admin/profesionales`.
2. La profesional creada queda con rol `PROFESIONAL`.
3. La profesional creada queda con `debeCambiarPassword=true`.
4. En su primer login, el frontend debe enviarla a cambiar contraseña.

### Resetear contraseña de una profesional

1. ADMIN llama `POST /api/admin/profesionales/{id}/resetear-password` con `passwordNueva`.
2. El backend guarda la contraseña hasheada y marca `debeCambiarPassword=true`.
3. La profesional puede iniciar sesión con la nueva contraseña.
4. Al iniciar sesión, el frontend debe enviarla a cambiar contraseña porque `debeCambiarPassword=true`.

### Editar datos de una profesional

1. ADMIN llama `PUT /api/admin/profesionales/{id}` con nombre, apellido, email, teléfono y especialidad.
2. El backend actualiza solo esos datos básicos.
3. El endpoint no modifica `rol`, `password` ni `debeCambiarPassword`.
4. Si el email ya pertenece a otra profesional, el backend responde `400`.

### Trabajo diario de una profesional

1. Al entrar, cargar el dashboard del día con `GET /api/dashboard` (turnos del día, realizados, pacientes activos y recaudado del día).
2. Mostrar los próximos turnos con `GET /api/turnos/proximos` (todos los del próximo día con turnos; o de una fecha con `?fecha=`).
3. Crear paciente.
4. Crear servicios activos.
5. Crear turno con `pacienteId`, `fechaHora` y `servicioIds`.
6. Cambiar estado del turno según avance.
7. Si el turno se realiza, crear sesión clínica.
8. Asociar fotos a la sesión si corresponde.
9. Registrar pagos.
10. Consultar resumen de pagos para deuda y `GET /api/pagos/resumen-diario` para el total recaudado del día.
11. Crear bloqueos de agenda para horarios no disponibles.

## Detalles importantes para evitar errores

- No enviar `rol` al crear profesionales: el backend siempre asigna `PROFESIONAL`.
- No enviar `rol` ni `password` al editar profesionales con `PUT /api/admin/profesionales/{id}`.
- Al resetear contraseña, asumir que la profesional deberá cambiarla en el próximo login.
- No enviar ni mostrar `password` en responses: `ProfesionalResponse` no lo expone.
- No implementar signup público: no existe endpoint.
- No dejar que una profesional vea pantallas admin aunque el frontend oculte botones; el backend igualmente responderá 403.
- No confiar en IDs de profesional enviados desde el frontend: la API usa el `profesionalId` del token.
- En `PacienteRequest`, `profesionalId` es legacy e ignorado.
- Las fotos se suben como `multipart/form-data` (campo `file`), **no** como JSON. Para mostrarlas hay que bajar `GET /api/fotos/{id}/contenido` con el header `Authorization` y usar un object URL (un `<img src>` directo falla por falta de token). Máximo 15 MB por imagen.
- En turnos, `servicioIds` no puede estar vacío.
- Para listas largas usar los endpoints `.../pagina` (default `size=5`) en vez de traer todo. Para filtrar la agenda usar `GET /api/turnos/pagina` con `fecha` (día puntual) o `desde`/`hasta` (rango histórico); para pagos, la vista de dos niveles `GET /api/pagos/por-dia` + `GET /api/pagos/pagina?fecha=`.
- Los campos de texto validan longitud máxima (255 o 5000 según el campo) y devuelven `400` con un `ValidationErrorResponse` indicando el campo. DNI/CUIT y teléfono solo aceptan números y signos válidos; texto libre da `400`, no `500`.
- Para el dashboard usar `GET /api/dashboard?fecha=` y `GET /api/pagos/resumen-diario?fecha=`: calculan por día y no mezclan totales históricos con datos del día. El total histórico sigue disponible en `GET /api/pagos`.
- Para "próximos turnos" usar `GET /api/turnos/proximos`: trae todos los turnos del día consultado, sin límite fijo de 5.
- Las fechas de `?fecha=` van en formato `yyyy-MM-dd`; `pacientesActivos` del dashboard es un total y no depende de la fecha.
- En pagos, si `metodo` es `TRUEQUE`, usar `detalleTrueque`.
- Los recursos de otra profesional devuelven 404 para no revelar que existen.
- En la ficha de menopausia (MRS), un paciente puede tener **muchas** evaluaciones: crear una segunda devuelve 201, no 409. No reutilizar la lógica de "ya existe ficha" de las historias clínicas.
- En `EvaluacionMenopausiaRequest` los 11 síntomas son obligatorios. Conviene inicializar el formulario con los 11 en `0` (que es un valor válido: "no procede/ninguno"), no en `null`, para no comerse un 400.
- Los 4 puntajes y las 4 severidades de la MRS son de solo lectura: se calculan en el backend y se ignoran si se envían. La severidad se recalcula en cada lectura a partir del puntaje, así que si algún día se actualizan los puntos de corte, todo el histórico pasa a mostrarse con el criterio nuevo y las tomas siguen siendo comparables entre sí.
- Si el frontend necesita documentación viva, usar Swagger en `http://localhost:8080/swagger-ui.html`.
