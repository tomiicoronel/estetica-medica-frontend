import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { listarPacientes } from '../../api/endpoints/pacientes'
import { listarServicios, listarServiciosActivos } from '../../api/endpoints/servicios'
import { actualizarTurno, crearTurno } from '../../api/endpoints/turnos'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CampoFecha } from '../../components/ui/CampoFecha'
import { CampoHora } from '../../components/ui/CampoHora'
import { Modal } from '../../components/ui/Modal'
import { esHoraValida } from '../../lib/fecha'
import { formatearMonto } from '../../lib/formato'
import { desplazarFin, sugerirFin, validarRangoHorario } from '../../lib/horario'
import type { TurnoResponse, UUID } from '../../types/api'

interface Props {
  /** Si viene, el turno se agenda para ese paciente y el selector no se muestra. */
  pacienteId?: UUID
  /** Si viene, el modal edita ese turno en vez de crear uno nuevo. */
  turno?: TurnoResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

export function TurnoFormModal({ pacienteId, turno, onCerrar, onListo }: Props) {
  const editando = turno !== undefined
  const [paciente, setPaciente] = useState<UUID>(turno?.pacienteId ?? pacienteId ?? '')
  const [fecha, setFecha] = useState(turno ? turno.fechaHora.slice(0, 10) : '')
  const [hora, setHora] = useState(turno ? turno.fechaHora.slice(11, 16) : '')
  const [horaFin, setHoraFin] = useState(turno ? turno.fechaHoraFin.slice(11, 16) : '')
  // Al editar, el fin ya guardado gana; al crear arranca en modo "sugerido"
  // hasta que la profesional lo toque a mano.
  const [finManual, setFinManual] = useState(editando)
  const [servicioIds, setServicioIds] = useState<UUID[]>(
    turno ? turno.servicios.map((s) => s.servicioId) : [],
  )
  const [observaciones, setObservaciones] = useState(turno?.observaciones ?? '')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  // Sólo los activos: un servicio desactivado no se puede agendar de nuevo.
  const servicios = useQuery({
    queryKey: ['servicios', 'activos'],
    queryFn: listarServiciosActivos,
  })

  // Activos e inactivos: la duración de un servicio no se congela como el
  // precio, así que un servicio inactivo que el turno ya tenía necesita
  // igual su duracionMinutos actual para la suma.
  const serviciosTodos = useQuery({
    queryKey: ['servicios'],
    queryFn: listarServicios,
    enabled: editando,
  })

  const pacientes = useQuery({
    queryKey: ['pacientes'],
    queryFn: listarPacientes,
    enabled: pacienteId === undefined && !editando,
  })

  const activos = useMemo(
    () => (pacientes.data ?? []).filter((p) => p.activo),
    [pacientes.data],
  )

  // Servicios que el turno ya tenía y que después se desactivaron: siguen
  // pudiendo mantenerse o sacarse, pero no volver a agregarse.
  const serviciosInactivosDelTurno = useMemo(() => {
    if (!turno) return []
    const idsActivos = new Set((servicios.data ?? []).map((s) => s.id))
    return turno.servicios.filter((s) => !idsActivos.has(s.servicioId))
  }, [turno, servicios.data])

  const listaServicios = useMemo(
    () => [
      ...(servicios.data ?? []).map((s) => ({ id: s.id, nombre: s.nombre, inactivo: false })),
      ...serviciosInactivosDelTurno.map((s) => ({
        id: s.servicioId,
        nombre: s.nombre,
        inactivo: true,
      })),
    ],
    [servicios.data, serviciosInactivosDelTurno],
  )

  const idsOriginales = useMemo(
    () => new Set(turno?.servicios.map((s) => s.servicioId) ?? []),
    [turno],
  )

  const precioMomentoPorId = useMemo(
    () => new Map(turno?.servicios.map((s) => [s.servicioId, s.precioMomento]) ?? []),
    [turno],
  )

  // Un servicio que ya estaba en el turno conserva su precioMomento congelado;
  // uno nuevo toma el precio actual. Así se refleja lo mismo que calcula el backend.
  const precioDe = (id: UUID): number => {
    if (idsOriginales.has(id)) return precioMomentoPorId.get(id) ?? 0
    return (servicios.data ?? []).find((s) => s.id === id)?.precio ?? 0
  }

  const total = useMemo(
    () => servicioIds.reduce((suma, id) => suma + precioDe(id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [servicioIds, servicios.data, idsOriginales, precioMomentoPorId],
  )

  // La duración no se congela como el precio: siempre se usa la actual, tanto
  // para un servicio activo como para uno inactivo que el turno ya tenía.
  const duracionDe = (id: UUID): number =>
    (servicios.data ?? []).find((s) => s.id === id)?.duracionMinutos ??
    (serviciosTodos.data ?? []).find((s) => s.id === id)?.duracionMinutos ??
    0

  const duracionTotal = useMemo(
    () => servicioIds.reduce((suma, id) => suma + duracionDe(id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [servicioIds, servicios.data, serviciosTodos.data],
  )

  const sugerenciaFin = sugerirFin(hora, duracionTotal)
  const mostrarSugerencia =
    finManual && sugerenciaFin !== null && sugerenciaFin !== horaFin

  // Mientras el fin no se tocó a mano, sigue a la sugerencia (inicio + suma de
  // duraciones) cada vez que cambian el inicio o los servicios elegidos.
  useEffect(() => {
    if (finManual) return
    setHoraFin(sugerirFin(hora, duracionTotal) ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finManual, hora, duracionTotal])

  // CampoHora manda cada valor intermedio mientras se tipea ("1", "14",
  // "14:3"), que todavía no son horas válidas: desplazar contra esos valores
  // fallaría siempre. El ancla guarda el último inicio válido para desplazar
  // siempre desde ahí, no desde el intermedio a medio tipear.
  const horaAnclaRef = useRef(hora)

  function onCambiarHora(nuevaHora: string) {
    // Con el fin ya tocado a mano, mover el inicio lo arrastra con la misma
    // duración (como en Google Calendar); si cruzara la medianoche se deja
    // el fin como está y la validación al enviar avisa del problema.
    if (finManual && esHoraValida(nuevaHora)) {
      const desplazado = desplazarFin(horaAnclaRef.current, horaFin, nuevaHora)
      if (desplazado !== null) setHoraFin(desplazado)
    }
    if (esHoraValida(nuevaHora)) horaAnclaRef.current = nuevaHora
    setHora(nuevaHora)
  }

  function onCambiarHoraFin(nuevaHoraFin: string) {
    setHoraFin(nuevaHoraFin)
    setFinManual(true)
  }

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () => {
      const datos = {
        fechaHora: `${fecha}T${hora}:00`,
        fechaHoraFin: `${fecha}T${horaFin}:00`,
        servicioIds,
        observaciones: observaciones.trim() === '' ? undefined : observaciones.trim(),
      }
      return turno
        ? actualizarTurno(turno.id, datos)
        : crearTurno({ pacienteId: paciente, ...datos })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['turnos'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (turno) {
        await queryClient.invalidateQueries({
          queryKey: ['pagos', 'turno', turno.id, 'resumen'],
        })
      }
      onListo(turno ? 'Turno actualizado.' : 'Turno agendado.')
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrorLocal(null)

    if (paciente === '') {
      setErrorLocal('Elegí el paciente del turno.')
      return
    }
    if (fecha === '') {
      setErrorLocal('Elegí la fecha del turno.')
      return
    }
    if (!esHoraValida(hora)) {
      setErrorLocal('La hora tiene que estar en formato hh:mm, por ejemplo 14:30.')
      return
    }
    if (servicioIds.length === 0) {
      setErrorLocal('Elegí al menos un servicio.')
      return
    }
    const errorRango = validarRangoHorario(hora, horaFin)
    if (errorRango) {
      setErrorLocal(errorRango)
      return
    }

    mutacion.mutate()
  }

  function alternarServicio(id: UUID) {
    setServicioIds((previos) =>
      previos.includes(id) ? previos.filter((x) => x !== id) : [...previos, id],
    )
  }

  const error = mutacion.error
  const campo = (nombre: string) =>
    error instanceof ApiError ? error.campo(nombre) : undefined

  const mostrarSelectorPaciente = pacienteId === undefined && !editando

  return (
    <Modal
      titulo={editando ? 'Editar turno' : 'Nuevo turno'}
      subtitulo={
        editando
          ? 'Los servicios que ya tenía el turno conservan su precio original.'
          : 'Se congelan los precios de los servicios al momento de crearlo.'
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-turno" cargando={mutacion.isPending}>
            {editando ? 'Guardar cambios' : 'Agendar turno'}
          </Button>
        </>
      }
    >
      <form id="form-turno" onSubmit={onSubmit} className="flex flex-col gap-[15px]">
        {mostrarSelectorPaciente && (
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="turno-paciente" className="text-[13px] font-medium text-sage-800">
              Paciente<span className="ml-1 text-clay-500">*</span>
            </label>
            <select
              id="turno-paciente"
              value={paciente}
              onChange={(e) => setPaciente(e.target.value)}
              className="w-full rounded-control border border-sand-300 bg-white px-[13px] py-[11px] text-sm"
            >
              <option value="">Elegí un paciente</option>
              {activos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
            {pacientes.data && activos.length === 0 && (
              <span className="text-xs text-sand-700">
                No tenés pacientes activos. Cargá uno antes de agendar.
              </span>
            )}
          </div>
        )}

        <div className="grid gap-[13px] app:grid-cols-3 app:gap-[15px]">
          <CampoFecha
            label="Fecha"
            required
            superficie="blanco"
            value={fecha}
            onChange={setFecha}
            error={campo('fechaHora')}
          />
          <CampoHora
            label="Hora"
            required
            superficie="blanco"
            value={hora}
            onChange={onCambiarHora}
            ayuda="Escribí 1430 y se completa solo."
          />
          <div className="flex flex-col gap-[7px]">
            <CampoHora
              label="Hora de fin"
              required
              superficie="blanco"
              value={horaFin}
              onChange={onCambiarHoraFin}
              error={campo('fechaHoraFin')}
            />
            {mostrarSugerencia && sugerenciaFin !== null && (
              <span className="text-xs text-sand-700">
                Sugerido: {sugerenciaFin}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setHoraFin(sugerenciaFin)
                    setFinManual(false)
                  }}
                  className="font-semibold text-sage-700 underline"
                >
                  Usar
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-medium text-sage-800">
            Servicios<span className="ml-1 text-clay-500">*</span>
          </span>

          {servicios.isPending && (
            <span className="text-[13px] text-sand-700">Cargando servicios…</span>
          )}

          {servicios.data && listaServicios.length === 0 && (
            <span className="text-[13px] text-sand-700">
              No tenés servicios activos. Cargá uno en la pantalla de Servicios.
            </span>
          )}

          <div className="flex flex-col gap-2">
            {listaServicios.map((servicio) => {
              const elegido = servicioIds.includes(servicio.id)
              const bloqueado = servicio.inactivo && !elegido
              return (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => !bloqueado && alternarServicio(servicio.id)}
                  disabled={bloqueado}
                  aria-pressed={elegido}
                  className={`flex min-h-11 items-center gap-3 rounded-control border px-[13px] py-2.5 text-left transition-colors ${
                    elegido
                      ? 'border-sage-400 bg-sage-50'
                      : 'border-sand-300 bg-white hover:bg-sand-100'
                  } ${bloqueado ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span
                    aria-hidden
                    className={`flex size-[18px] flex-none items-center justify-center rounded-[6px] border text-[11px] text-white ${
                      elegido ? 'border-sage-600 bg-sage-600' : 'border-sand-300'
                    }`}
                  >
                    {elegido ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {servicio.nombre}
                    {servicio.inactivo && ' (inactivo)'}
                  </span>
                  <span className="flex-none text-[13.5px] font-semibold text-sage-800">
                    {formatearMonto(precioDe(servicio.id))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <label htmlFor="turno-obs" className="text-[13px] font-medium text-sage-800">
            Observaciones
          </label>
          <textarea
            id="turno-obs"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="Opcional"
            className="w-full resize-y rounded-control border border-sand-300 bg-white px-[13px] py-[11px] text-sm placeholder:text-sand-500"
          />
        </div>

        <div className="flex items-center gap-3 rounded-control border border-sand-200 bg-sand-100 px-[15px] py-3">
          <span className="text-[13px] font-medium text-sand-700">Total del turno</span>
          <span className="ml-auto text-[19px] font-semibold tracking-[-0.02em] text-sage-800">
            {formatearMonto(total)}
          </span>
        </div>

        {errorLocal && <Alert>{errorLocal}</Alert>}
        {error && <Alert>{mensajeDeError(error)}</Alert>}
      </form>
    </Modal>
  )
}

function mensajeDeError(error: Error): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectarnos con el servidor. Verificá que el backend esté levantado.'
  }
  return error.message
}
