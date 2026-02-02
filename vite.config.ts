import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // CRUCIAL pour que les assets chargent sur Firebase
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})