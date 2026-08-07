import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, the BFF (NestJS, started separately with `npm run start:dev` in bff/)
      // runs on :3000. Proxying keeps the browser on a single origin (:5173) so the
      // session cookie the BFF sets behaves exactly like it will in production, where
      // Nest serves this app's build output itself — no CORS config needed either way.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Without this, Vite's dev proxy never forwards the WebSocket
        // upgrade request for /api/chat/ws — chat silently can't connect
        // in dev even though the same code works once single-origin-served
        // in production.
        ws: true,
      },
    },
  },
})
