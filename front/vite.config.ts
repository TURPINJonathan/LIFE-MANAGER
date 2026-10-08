import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), reactRouter()],
  server: {
    // 0.0.0.0 : écoute LAN. Sous WSL2, le téléphone ne joint pas ce port
    // via l’IP Windows sans portproxy / networking mirrored (voir README).
    host: true,
    port: 9200,
    strictPort: true,
    // Même origine sur le téléphone : /api → nginx Docker (évite localhost + CORS).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9100',
        changeOrigin: true,
      },
    },
  },
});
