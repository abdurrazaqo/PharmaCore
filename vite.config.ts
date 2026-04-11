import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless'
      }
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env': {}
    },
    resolve: {
      alias: {
        '@/': path.resolve(__dirname, './'),
      }
    },
    envDir: '.',
    optimizeDeps: {
      exclude: ['@journeyapps/wa-sqlite', '@powersync/web']
    },
    worker: {
      format: 'es'
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        }
      }
    }
  };
});
