# 🎨 Paleta de colores — EsteticaApp

Tema **"Spa moderno"**: verde salvia + arena, con terracota de acento.
Los colores están definidos como tokens de Tailwind v4 en
`src/index.css` (variables `--color-*`).

Identidad de marca: **sage + sand + clay**.

> Los verdes (`sage`) se construyeron tomando como anclas tres tonos elegidos a mano:
> `#D9E9CF` (claro), `#B6CEB4` (medio) y `#96A78D` (tono de identidad).
> El resto de la escala se derivó de esos tres para mantener la armonía.

---

## 🌿 Sage (verde salvia) — color primario

Botones, navegación activa, textos y acentos.

| Token | Hex | Uso típico |
|---|---|---|
| `sage-50`  | `#f3f7f0` | Fondos muy suaves |
| `sage-100` | `#e8f0e2` | Hovers, badges |
| `sage-200` | `#d9e9cf` | Superficies suaves (ancla clara elegida) |
| `sage-300` | `#b6ceb4` | Bordes, scrollbar (ancla media elegida) |
| `sage-400` | `#a5bb9f` | Focus rings |
| `sage-500` | `#96a78d` | Tono de identidad (ancla elegida) |
| `sage-600` | `#7e9075` | **Botón primario** |
| `sage-700` | `#65745d` | Botón hover, textos |
| `sage-800` | `#4f5a49` | Títulos |
| `sage-900` | `#3d463a` | Texto base |

## 🏖️ Sand (arena) — color secundario / neutro

Fondos, superficies y bordes.

| Token | Hex | Uso típico |
|---|---|---|
| `sand-50`  | `#faf8f3` | Fondo de tarjetas |
| `sand-100` | `#f6f4ee` | **Fondo de la app** |
| `sand-200` | `#ece7d9` | Bordes |
| `sand-300` | `#ddd4be` | Bordes de inputs |
| `sand-400` | `#c9bb9c` | — |
| `sand-500` | `#b5a37e` | — |
| `sand-600` | `#9c8765` | — |
| `sand-700` | `#7d6c53` | — |
| `sand-800` | `#655746` | — |
| `sand-900` | `#54493c` | — |

## 🧱 Clay (terracota) — acento / acciones destructivas

Botón "danger", errores y validaciones.

| Token | Hex | Uso típico |
|---|---|---|
| `clay-400` | `#c98b6b` | Bordes/acentos de error |
| `clay-500` | `#b97350` | **Botón danger**, asteriscos de campos obligatorios |

---

## Colores de estado (Badges)

Los `Badge` de estado usan además colores estándar de Tailwind:

| Tono | Color base | Uso |
|---|---|---|
| `green` | emerald | Activa / Realizado |
| `gray`  | slate   | Inactiva |
| `amber` | amber   | Pendiente |
| `red`   | rose    | Cancelado |
| `blue`  | sky     | Confirmado |
| `sage` / `sand` / `clay` | marca | Acentos varios |

---

## Otros tokens de diseño

- **Fuente:** `Inter` (`--font-sans`)
- **Radios:** `--radius-xl: 1rem`, `--radius-2xl: 1.25rem` → clases `rounded-xl` / `rounded-2xl`
- **Fondo de la app:** `sand-100`
- **Texto base:** `sage-900`

---

## Criterio de diseño (para defender las decisiones)

- **Primario (sage):** verde salvia por la identidad del rubro estético — transmite calma, salud y cuidado.
- **Neutros (sand):** arena en vez de grises fríos, para dar calidez a fondos y bordes sin competir con el primario.
- **Acento semántico (clay):** terracota en lugar de rojo puro para acciones destructivas y errores; comunica peligro manteniendo la armonía cálida del conjunto.
- **Tipografía (Inter):** legible, neutra y profesional; estándar en apps de gestión.
