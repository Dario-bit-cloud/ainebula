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
        secure: true,
        ws: false,
        rewrite: (path) => {
          // Trasforma /api/zukijourney/chat/completions in /api/v1/chat/completions
          const newPath = path.replace(/^\/api\/zukijourney/, '/api/v1');
          return newPath;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Mantieni gli headers originali, incluso Authorization
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            // Aggiungi header per evitare problemi CORS
            proxyReq.setHeader('Origin', 'https://zukijourney.com');
            proxyReq.setHeader('Referer', 'https://zukijourney.com/');
          });
        }
      }
    }
  }
});

