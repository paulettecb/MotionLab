import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Base path condicional (§2.11): GH Pages sirve el repo bajo /motion-lab/,
// Vercel/Netlify (u otro host) bajo /. El workflow de deploy exporta
// DEPLOY_TARGET=gh-pages solo para el build que sube a Pages.
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? '/motion-lab/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [vue(), basicSsl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // @vitejs/plugin-basic-ssl ya activa server.https con el certificado
    // autofirmado; no hace falta (ni el tipo de Vite lo acepta) pasar un
    // booleano aquí.
    host: true, // expone en la LAN para probar desde el teléfono
  },
  build: {
    target: 'es2022',
  },
})
