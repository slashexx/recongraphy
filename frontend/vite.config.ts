import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      "/proxy": {
        target: "http://aswinr24-tech.me",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, '')
      },
    },
  }
});
