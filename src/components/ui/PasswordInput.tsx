import { useState } from 'react'
import { Input, type InputProps } from './Input'

/** Ojo abierto / tachado. SVG inline para no sumar una librería de íconos por dos formas. */
function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado && <path d="m4 20 16-16" />}
    </svg>
  )
}

/**
 * Campo de contraseña con botón para mostrar/ocultar lo escrito.
 *
 * Existe como componente único para que login, cambio de contraseña y el alta y
 * reseteo de profesionales del panel admin compartan el mismo control.
 */
export function PasswordInput({ ...props }: Omit<InputProps, 'type' | 'sufijo'>) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      sufijo={
        <button
          // type="button": dentro de un <form>, un button sin type lo envía.
          type="button"
          onClick={() => setVisible((actual) => !actual)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="flex size-8 items-center justify-center rounded-lg text-sand-600 transition-colors hover:bg-sand-200 hover:text-sage-800"
        >
          <IconoOjo tachado={visible} />
        </button>
      }
    />
  )
}
