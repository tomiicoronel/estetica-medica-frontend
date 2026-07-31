/**
 * Placeholder de pantallas todavía no construidas.
 * Existe para que el ruteo y los guards se puedan verificar de punta a punta
 * antes de tener las pantallas. Se va borrando a medida que avanzamos.
 */
export function Pendiente({ titulo }: { titulo: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-10 text-center">
      <h1 className="text-xl font-semibold text-sage-800">{titulo}</h1>
      <p className="text-sm text-sand-700">Pantalla pendiente de construir.</p>
    </div>
  )
}
