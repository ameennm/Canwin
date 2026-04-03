import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5179,
    proxy: {
      '/api': {
        target: 'https://742628e5.canwin-cxi.pages.dev',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
