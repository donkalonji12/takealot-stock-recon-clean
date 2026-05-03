import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/takealot': {
        target: 'https://seller-api.takealot.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/takealot/, ''),
      }
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    target: 'esnext'
  }
})
