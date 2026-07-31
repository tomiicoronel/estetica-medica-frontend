import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { actualizarPaciente, crearPaciente } from '../../api/endpoints/pacientes'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CampoFecha } from '../../components/ui/CampoFecha'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import type { PacienteRequest, PacienteResponse } from '../../types/api'

interface Props {
  /** Undefined = alta; definido = edición de esa ficha. */
  paciente?: PacienteResponse
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/** Vacío → undefined: mandar "" guardaría un string vacío en un campo opcional. */
function opcional(valor: string): string | undefined {
  const limpio = valor.trim()
  return limpio === '' ? undefined : limpio
}

/**
 * Alta y edición de la ficha. Comparten formulario porque `PUT /api/pacientes/{id}`
 * recibe el mismo `PacienteRequest` completo que el POST: mandar sólo los campos
 * tocados borraría el resto.
 *
 * El diseño resuelve el contacto de emergencia con un solo campo, pero la API
 * lo guarda en tres columnas separadas (nombre, teléfono y parentesco); partirlo
 * a mano sería adivinar, así que van los tres campos.
 *
 * Las entidades de traslado existen en `PacienteRequest` y el diseño no las pone
 * en ningún formulario; van acá para que la ficha no tenga datos que se puedan
 * leer pero nunca cargar.
 */
export function PacienteFormModal({ paciente, onCerrar, onListo }: Props) {
  const esEdicion = paciente !== undefined

  const [nombre, setNombre] = useState(paciente?.nombre ?? '')
  const [apellido, setApellido] = useState(paciente?.apellido ?? '')
  const [dniCuit, setDniCuit] = useState(paciente?.dniCuit ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(paciente?.fechaNacimiento ?? '')
  const [telefono, setTelefono] = useState(paciente?.telefono ?? '')
  const [email, setEmail] = useState(paciente?.email ?? '')
  const [profesion, setProfesion] = useState(paciente?.profesion ?? '')
  const [obraSocial, setObraSocial] = useState(paciente?.obraSocial ?? '')
  const [numeroObraSocial, setNumeroObraSocial] = useState(paciente?.numeroObraSocial ?? '')
  const [domicilio, setDomicilio] = useState(paciente?.domicilio ?? '')
  const [emergenciaNombre, setEmergenciaNombre] = useState(
    paciente?.contactoEmergenciaNombre ?? '',
  )
  const [emergenciaTelefono, setEmergenciaTelefono] = useState(
    paciente?.contactoEmergenciaTelefono ?? '',
  )
  const [emergenciaParentesco, setEmergenciaParentesco] = useState(
    paciente?.contactoEmergenciaParentesco ?? '',
  )
  const [traslado1, setTraslado1] = useState(paciente?.entidadTraslado1 ?? '')
  const [traslado2, setTraslado2] = useState(paciente?.entidadTraslado2 ?? '')

  const queryClient = useQueryClient()

  const mutacion = useMutation({
    mutationFn: () => {
      const datos: PacienteRequest = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dniCuit: dniCuit.trim(),
        telefono: telefono.trim(),
        fechaNacimiento: opcional(fechaNacimiento),
        email: opcional(email),
        profesion: opcional(profesion),
        obraSocial: opcional(obraSocial),
        numeroObraSocial: opcional(numeroObraSocial),
        domicilio: opcional(domicilio),
        contactoEmergenciaNombre: opcional(emergenciaNombre),
        contactoEmergenciaTelefono: opcional(emergenciaTelefono),
        contactoEmergenciaParentesco: opcional(emergenciaParentesco),
        entidadTraslado1: opcional(traslado1),
        entidadTraslado2: opcional(traslado2),
      }

      return esEdicion ? actualizarPaciente(paciente.id, datos) : crearPaciente(datos)
    },
    onSuccess: async (guardado) => {
      await queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      onListo(
        esEdicion
          ? 'Ficha actualizada.'
          : `${guardado.nombre} ${guardado.apellido} ya está en tu listado.`,
      )
    },
  })

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    mutacion.mutate()
  }

  const error = mutacion.error
  const campo = (nombreCampo: string) =>
    error instanceof ApiError ? error.campo(nombreCampo) : undefined

  return (
    <Modal
      titulo={esEdicion ? 'Editar ficha' : 'Nuevo paciente'}
      subtitulo={
        esEdicion
          ? 'Los cambios no tocan turnos, pagos ni historia clínica.'
          : 'Los campos con datos de contacto ayudan a identificarlo rápido.'
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-paciente" cargando={mutacion.isPending}>
            {esEdicion ? 'Guardar cambios' : 'Guardar paciente'}
          </Button>
        </>
      }
    >
      <form
        id="form-paciente"
        onSubmit={onSubmit}
        className="grid gap-[13px] app:grid-cols-2 app:gap-[15px]"
      >
        <Input
          label="Nombre"
          required
          superficie="blanco"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={campo('nombre')}
        />
        <Input
          label="Apellido"
          required
          superficie="blanco"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          error={campo('apellido')}
        />
        <Input
          label="DNI / CUIT"
          required
          superficie="blanco"
          // El backend valida ^[0-9.\-]+$: nada de letras ni espacios.
          inputMode="numeric"
          placeholder="34.812.907"
          value={dniCuit}
          onChange={(e) => setDniCuit(e.target.value)}
          error={campo('dniCuit')}
        />
        <CampoFecha
          label="Fecha de nacimiento"
          superficie="blanco"
          value={fechaNacimiento}
          onChange={setFechaNacimiento}
          // Nadie nace mañana; el selector no ofrece años futuros.
          anioMaximo={new Date().getFullYear()}
          error={campo('fechaNacimiento')}
        />
        <Input
          label="Teléfono"
          required
          superficie="blanco"
          inputMode="tel"
          placeholder="+54 9 11 ..."
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={campo('telefono')}
        />
        <Input
          label="Email"
          type="email"
          superficie="blanco"
          placeholder="Opcional"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={campo('email')}
        />
        <Input
          label="Profesión"
          superficie="blanco"
          placeholder="Opcional"
          value={profesion}
          onChange={(e) => setProfesion(e.target.value)}
          error={campo('profesion')}
        />
        <Input
          label="Obra social"
          superficie="blanco"
          placeholder="Opcional"
          value={obraSocial}
          onChange={(e) => setObraSocial(e.target.value)}
          error={campo('obraSocial')}
        />
        <Input
          label="N° de afiliado"
          superficie="blanco"
          placeholder="Opcional"
          value={numeroObraSocial}
          onChange={(e) => setNumeroObraSocial(e.target.value)}
          error={campo('numeroObraSocial')}
        />
        <Input
          label="Domicilio"
          superficie="blanco"
          placeholder="Opcional"
          value={domicilio}
          onChange={(e) => setDomicilio(e.target.value)}
          error={campo('domicilio')}
        />

        <div className="app:col-span-2">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
            Contacto de emergencia
          </span>
        </div>
        <Input
          label="Nombre"
          superficie="blanco"
          placeholder="Opcional"
          value={emergenciaNombre}
          onChange={(e) => setEmergenciaNombre(e.target.value)}
          error={campo('contactoEmergenciaNombre')}
        />
        <Input
          label="Teléfono"
          superficie="blanco"
          inputMode="tel"
          placeholder="Opcional"
          value={emergenciaTelefono}
          onChange={(e) => setEmergenciaTelefono(e.target.value)}
          error={campo('contactoEmergenciaTelefono')}
        />
        <Input
          label="Parentesco"
          superficie="blanco"
          placeholder="Opcional"
          value={emergenciaParentesco}
          onChange={(e) => setEmergenciaParentesco(e.target.value)}
          error={campo('contactoEmergenciaParentesco')}
        />

        <div className="app:col-span-2">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sand-500">
            Entidades de traslado
          </span>
        </div>
        <Input
          label="Primera entidad"
          superficie="blanco"
          placeholder="Opcional"
          value={traslado1}
          onChange={(e) => setTraslado1(e.target.value)}
          error={campo('entidadTraslado1')}
        />
        <Input
          label="Segunda entidad"
          superficie="blanco"
          placeholder="Opcional"
          value={traslado2}
          onChange={(e) => setTraslado2(e.target.value)}
          error={campo('entidadTraslado2')}
        />

        {error && (
          <div className="app:col-span-2">
            <Alert>{mensajeDeError(error)}</Alert>
          </div>
        )}
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
