import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // El backend solo habilita CORS para http://localhost:5173.
    // strictPort evita que Vite se mueva a otro puerto en silencio y rompa el login.
    port: 5173,
    strictPort: true,
  },
})
