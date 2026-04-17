import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      // Exclure le dossier docs de Vite
      deny: ['.env', '.env.*', '*.{pem,crt}', 'docs/**']
    }
  },
  build: {
    // Exclure docs du build
    rollupOptions: {
      external: []
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
