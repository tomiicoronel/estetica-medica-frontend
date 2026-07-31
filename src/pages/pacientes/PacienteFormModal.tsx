import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { crearPaciente } from '../../api/endpoints/pacientes'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CampoFecha } from '../../components/ui/CampoFecha'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import type { PacienteRequest } from '../../types/api'

interface Props {
  onCerrar: () => void
  onListo: (mensaje: string) => void
}

/** Vacío → undefined: mandar "" guardaría un string vacío en un campo opcional. */
function opcional(valor: string): string | undefined {
  const limpio = valor.trim()
  return limpio === '' ? undefined : limpio
}

/**
 * Alta de paciente.
 *
 * El diseño resuelve el contacto de emergencia con un solo campo, pero la API
 * lo guarda en tres columnas separadas (nombre, teléfono y parentesco); partirlo
 * a mano sería adivinar, así que van los tres campos.
 *
 * Las entidades de traslado existen en `PacienteRequest` y no están en este
 * formulario: el diseño las deja para la ficha del paciente, no para el alta.
 */
export function PacienteFormModal({ onCerrar, onListo }: Props) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [dniCuit, setDniCuit] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [profesion, setProfesion] = useState('')
  const [obraSocial, setObraSocial] = useState('')
  const [numeroObraSocial, setNumeroObraSocial] = useState('')
  const [domicilio, setDomicilio] = useState('')
  const [emergenciaNombre, setEmergenciaNombre] = useState('')
  const [emergenciaTelefono, setEmergenciaTelefono] = useState('')
  const [emergenciaParentesco, setEmergenciaParentesco] = useState('')

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
      }
      return crearPaciente(datos)
    },
    onSuccess: async (paciente) => {
      await queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      onListo(`${paciente.nombre} ${paciente.apellido} ya está en tu listado.`)
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
      titulo="Nuevo paciente"
      subtitulo="Los campos con datos de contacto ayudan a identificarlo rápido."
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-paciente" cargando={mutacion.isPending}>
            Guardar paciente
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
