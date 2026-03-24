import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // Base path is driven by VITE_BASE_PATH so staging and production
    // can deploy to different sub-paths without code changes.
    base: env.VITE_BASE_PATH || '/Tradazone/',
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
