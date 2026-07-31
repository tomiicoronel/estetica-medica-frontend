# Brief del Proyecto — Estética Backend

## 1. Resumen

**Estética Backend** es la API REST de un sistema de gestión para consultorios de estética
médica. Cada **profesional** administra de forma aislada sus pacientes, turnos, servicios,
historias clínicas, sesiones, fotos de evolución, pagos y bloqueos de agenda. Un rol
**administrador** gestiona el alta y mantenimiento de las cuentas profesionales.

- **Tipo:** backend REST (JSON) para una SPA (frontend React/Vite en repo separado).
- **Modelo de negocio:** multi-tenant por profesional (cada profesional ve solo lo suyo).
- **Estado:** funcional; build verde y suite de tests en verde.

---

## 2. Stack técnico

| Componente | Detalle |
|---|---|
| Lenguaje | Java 21 |
| Framework | Spring Boot 4.0.5 (Web MVC, Data JPA, Security, Validation) |
| Base de datos | PostgreSQL (`estetica_medica`) |
| ORM | Hibernate / JPA (`ddl-auto=update`) |
| Autenticación | JWT (jjwt 0.12.5), expiración 8 h |
| Documentación | springdoc OpenAPI 2.8.13 → Swagger UI en `/swagger-ui.html` |
| Utilidades | Lombok |
| Build | Maven (wrapper `mvnw`) |

**Correr localmente:**

```bash
# Requisitos: Java 21, PostgreSQL con la base estetica_medica
# Configurar src/main/resources/application.properties (ver application.properties.example)
./mvnw spring-boot:run          # levanta en http://localhost:8080
./mvnw test                     # corre la suite de tests
```

CORS habilitado solo para `http://localhost:5173` (frontend). Cambiar en `SecurityConfig`
si el front corre en otro origen.

---

## 3. Arquitectura

Arquitectura en capas clásica de Spring, paquete raíz `com.estetica.estetica`:

```
controller/   → endpoints REST (@RestController), validación de entrada
service/      → lógica de negocio, reglas de dominio, aislamiento multi-tenant
repository/   → Spring Data JPA (queries derivadas y @Query)
model/        → entidades JPA + enums de dominio
dto/request/  → cuerpos de entrada con Bean Validation
dto/response/ → cuerpos de salida
security/     → JWT (generación/validación), filtros, servicio de profesional autenticada
config/       → SecurityConfig, OpenApiConfig, seeders/inicializadores
exception/    → excepciones propias + GlobalExceptionHandler (@RestControllerAdvice)
```

**Aislamiento multi-tenant:** el `profesionalId` se toma **siempre del token JWT**
(`ProfesionalAutenticadaService`), nunca del cliente. Los servicios validan que cada
recurso pertenezca a la profesional autenticada; si no, se devuelve **404** (no 403) para
no revelar la existencia de recursos de otros tenants.

---

## 4. Modelo de dominio

Entidades principales (`model/`):

- **Profesional** — cuenta del sistema. Rol `ADMIN` o `PROFESIONAL`. Password hasheada,
  flag `debeCambiarPassword`.
- **Paciente** — pertenece a una profesional; DNI/CUIT único por profesional; baja lógica
  (`activo`) y baja física (solo si no tiene datos asociados).
- **Servicio** — prestación con precio; se activa/desactiva (no hay borrado físico).
- **Turno** — agenda de un paciente con uno o más servicios. Congela el precio de cada
  servicio al momento de creación (`TurnoServicio.precioMomento`). Estados en
  `EstadoTurno`: `PENDIENTE → CONFIRMADO → REALIZADO` / `CANCELADO`.
- **Pago** — pago parcial o total de un turno. `MetodoPago`: `EFECTIVO`, `TRANSFERENCIA`,
  `MERCADO_PAGO`, `TRUEQUE` (este último requiere detalle).
- **SesionClinica** — registro clínico de un turno realizado (1:1 con turno).
- **HistoriaClinicaFacial** / **HistoriaClinicaCorporal** — ficha clínica 1:1 con paciente.
- **FotoPaciente** — metadatos de una foto de evolución vinculada a una sesión clínica.
- **FotoPacienteImagen** — contenido binario (bytea) de la foto, en tabla aparte para que
  los listados no arrastren los bytes.
- **BloqueoAgenda** — franjas horarias no disponibles; bloquean la creación de turnos.

Relaciones clave: `Profesional 1─N Paciente`, `Paciente 1─N Turno`, `Turno 1─N Pago`,
`Turno 1─1 SesionClinica`, `SesionClinica 1─N FotoPaciente`, `Paciente 1─1 HistoriaFacial`
y `1─1 HistoriaCorporal`.

---

## 5. Seguridad y autenticación

- **Login:** `POST /api/auth/login` (público) → devuelve JWT + rol + `debeCambiarPassword`.
- **JWT** en header `Authorization: Bearer <token>` para todo el resto.
- **Roles:** `/api/admin/**` requiere `ADMIN`; el resto, cualquier usuario autenticado.
- **Cambio de password obligatorio:** mientras `debeCambiarPassword = true`, un filtro
  (`CambioPasswordObligatorioFilter`) bloquea todo salvo login y `cambiar-password`.
- **Sin registro público:** las cuentas se crean solo desde administración; toda cuenta
  nueva arranca con `debeCambiarPassword = true`.
- **Errores uniformes:** `GlobalExceptionHandler` traduce excepciones a `ErrorResponse` /
  `ValidationErrorResponse` con códigos correctos (400/401/403/404/409) y mensajes claros.

---

## 6. Módulos / funcionalidades

| Módulo | Endpoints base | Notas |
|---|---|---|
| Auth | `/api/auth/*` | login, cambio de contraseña |
| Administración | `/api/admin/profesionales/*` | ABM de profesionales, reset de password (solo ADMIN) |
| Perfil profesional | `/api/profesionales/me` | ver/editar datos propios |
| Pacientes | `/api/pacientes*` | ABM, baja lógica/física, listado paginado |
| Servicios | `/api/servicios*` | ABM, activar/desactivar, cambio de precio |
| Turnos | `/api/turnos*` | ABM, cambio de estado, filtros y paginación |
| Dashboard | `/api/dashboard` | métricas del día (zona horaria AR) |
| Historia clínica | `/api/.../historia-clinica-facial` y `-corporal` | ficha 1:1 por paciente |
| Sesiones clínicas | `/api/turnos/{id}/sesion-clinica`, `/api/sesiones-clinicas/*` | registro de sesión |
| Fotos de evolución | `/api/sesiones-clinicas/{id}/fotos`, `/api/fotos/*` | subida/descarga real, galería por día |
| Pagos | `/api/turnos/{id}/pagos`, `/api/pagos*` | pagos, resumen de deuda, resumen diario y por día |
| Bloqueos de agenda | `/api/bloqueos-agenda*` | franjas no disponibles |

> El detalle completo de endpoints, DTOs (TypeScript) y flujos está en **`GUIA_FRONTEND.md`**.
> La documentación viva está en **Swagger UI** (`/swagger-ui.html`).

---

## 7. Cambios recientes (última iteración de fixes)

Correcciones aplicadas al backend a partir del reporte de bugs:

1. **Historia clínica — 500 → 400 claro.** Se agregaron límites de longitud (`@Size`) a
   todos los campos de texto (255 o 5000 según columna) y `@Digits` a los numéricos de la
   ficha corporal. Ahora, al exceder el límite, se devuelve un **400 indicando el campo**,
   no un 500. Igual criterio en sesión clínica y turno.
2. **Fotos reales.** Antes se generaba una ruta ficticia y **no se guardaba ninguna imagen**.
   Ahora:
   - `POST /api/sesiones-clinicas/{id}/fotos` recibe **multipart** (`file` + `descripcion`)
     y guarda la imagen en PostgreSQL (`bytea`, tabla `fotos_paciente_imagen`).
   - `GET /api/fotos/{id}/contenido` descarga los bytes reales.
   - Validación de tipo (JPEG/PNG/WEBP/HEIC) y tamaño (máx 15 MB → 400 claro).
3. **Galería de fotos por día + paginación.**
   `GET /api/pacientes/{id}/fotos/por-dia` y `.../fotos/pagina?fecha=&page=&size=5`.
4. **Paginación server-side** (5 por página) sin romper los listados existentes:
   `GET /api/pacientes/pagina`, `/api/turnos/pagina`, `/api/pagos/pagina`.
   Envoltorio común `PageResponse<T>`.
5. **Filtros.** Turnos por `estado` / `fecha` (día) / `desde`–`hasta` (rango). Pagos por día
   con vista de dos niveles (`/api/pagos/por-dia` → `/api/pagos/pagina?fecha=`).
6. **Total recaudado del día** ya calculado por `/api/dashboard` y `/api/pagos/resumen-diario`
   (era cuestión de que el front consumiera esos endpoints, no el histórico).

Documentación y pruebas actualizadas: **`GUIA_FRONTEND.md`** y los scripts **`src/test/http/*.http`**
(con imagen de prueba en `src/test/http/assets/foto-prueba.png`).

---

## 8. Pendientes / temas del frontend (no backend)

Ítems reportados que corresponden al **frontend** (no se tocaron):

- Espacio / "leer más" en observaciones (sesiones y turnos).
- Estilo del toast de error (se veía semitransparente).
- Editar paciente mostraba datos de otro paciente (estado del front).
- Mostrar el error de validación de DNI/teléfono (el backend ya lo rechaza con 400).

**Nota importante para el front sobre fotos:** el endpoint de imagen requiere JWT, por lo
que un `<img src="/api/fotos/{id}/contenido">` directo no funciona. Hay que descargar el
binario con el header `Authorization`, generar un `object URL` (`URL.createObjectURL`) y
usarlo como `src`. Cada `FotoPacienteResponse` ya trae el campo `url`.

### Posibles próximos pasos (backend)

- Eliminado físico de archivos ya no aplica (las imágenes viven en la BD; el borrado ya
  elimina el binario asociado).
- Evaluar mover el binario de imágenes a almacenamiento externo (S3) si el volumen crece.
- Endpoints de reportes/exportación de pagos por período.

---

## 9. Referencias del repositorio

- `GUIA_FRONTEND.md` — guía de consumo de la API (endpoints, DTOs TS, flujos).
- `HELP.md` — ayuda generada por Spring Initializr.
- `src/main/resources/application.properties.example` — plantilla de configuración.
- `src/test/http/*.http` — pruebas manuales (REST Client de VS Code).
- Swagger UI — `http://localhost:8080/swagger-ui.html`.
```
