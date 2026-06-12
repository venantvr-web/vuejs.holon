import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      // Exclure le dossier docs de Vite
      deny: ['.env', '.env.*', '*.{pem,crt}', 'docs/**'],
    },
  },
  build: {
    // Exclure docs du build
    rollupOptions: {
      external: [],
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.{spec,test}.ts',
        'src/main.ts',
        'src/env.d.ts',
        'src/**/types.ts',
      ],
    },
  },
})
