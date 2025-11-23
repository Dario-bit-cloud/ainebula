import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      '/api/zukijourney': {
        target: 'https://zukijourney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/zukijourney/, '/api/v1'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Mantieni gli headers originali, incluso Authorization
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        }
      }
    }
  }
});

