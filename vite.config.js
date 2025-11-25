import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173
  },
  build: {
    // Ottimizzazioni per ridurre la dimensione del bundle
    minify: 'esbuild', // Più veloce di terser e già incluso
    // Rimuove console.log in produzione tramite esbuild
    esbuild: {
      drop: ['console', 'debugger'],
      legalComments: 'none'
    },
    // Code splitting ottimizzato
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separa le dipendenze vendor
          if (id.includes('node_modules')) {
            if (id.includes('svelte')) {
              return 'vendor-svelte';
            }
            if (id.includes('marked')) {
              return 'vendor-marked';
            }
            if (id.includes('highlight.js')) {
              return 'vendor-highlight';
            }
            // Altre dipendenze vendor
            return 'vendor';
          }
          // I modals vengono automaticamente separati grazie al lazy loading
          // Separa i servizi
          if (id.includes('/services/')) {
            return 'services';
          }
          // Separa gli stores
          if (id.includes('/stores/')) {
            return 'stores';
          }
        },
        // Ottimizza i nomi dei chunk
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Aumenta il limite di warning per chunk size (dopo code splitting sarà più piccolo)
    chunkSizeWarningLimit: 600,
    // Ottimizzazioni CSS
    cssCodeSplit: true,
    cssMinify: true,
    // Source maps solo in sviluppo
    sourcemap: false,
    // Target modern browsers per bundle più piccolo
    target: 'esnext',
    // Ottimizza le dipendenze
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  // Ottimizzazioni per le dipendenze
  optimizeDeps: {
    include: ['svelte', 'svelte/store', 'marked', 'highlight.js']
  }
});

