import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lets the frontend call relative /api/... URLs in development without any CORS
    // configuration on the backend — the browser only ever talks to this Vite dev server,
    // which forwards /api/* requests to the backend server-to-server.
    //
    // For LAN access (so a teammate's laptop can open http://<this-machine-ip>:5173), run
    // `npm run dev -- --host 0.0.0.0` — the proxy target below still points at this machine's
    // own localhost:8080, so the backend itself is never exposed on the network, only this
    // dev server is. See admin-web/README.md.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
