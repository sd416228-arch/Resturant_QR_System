import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import os from 'node:os'

// NOTE: Vite resolves vite.config.js before vite.config.ts — keep both in sync.
// Best-effort LAN IPv4 for QR codes scanned from phones on the same Wi-Fi.
function detectLanIp() {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    if (/vmware|vethernet|wsl|loopback|bluetooth|hyper-v|teredo|isatap|docker/i.test(name)) continue
    for (const net of nets[name] || []) {
      const family = String(net.family)
      if ((family === 'IPv4' || family === '4') && !net.internal) return net.address
    }
  }
  return null
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'lan-info',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if ((req.url || '').split('?')[0] === '/api/lan-info') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ lanIp: detectLanIp() }))
            return
          }
          next()
        })
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
