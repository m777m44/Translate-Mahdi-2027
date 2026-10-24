import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Accept any host header so the app also works behind proxies/previews.
        allowedHosts: true as const,
        // When running behind an HTTPS proxy, set MAHDI_HTTPS_HMR=1 so the HMR
        // socket uses wss://host:443 instead of ws://host:3000.
        hmr: process.env.MAHDI_HTTPS_HMR
          ? { clientPort: Number(process.env.MAHDI_HTTPS_HMR_PORT || 443), protocol: 'wss' }
          : undefined,
      },
      build: {
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
          output: {
            // Keep the heavy on-device AI runtime in its own lazy chunk so the
            // main app stays fast and only downloads it when a neural tool opens.
            // Vite automatically emits the ONNX wasm binary next to this chunk
            // and Transformers.js rewires wasmPaths to the bundled local asset.
            manualChunks: {
              'neural-runtime': ['@huggingface/transformers'],
            },
          },
        },
      },
      // Transformers.js / ONNX Runtime Web are loaded lazily at runtime;
      // pre-bundling them in dev causes duplicated ESM instances, so exclude.
      optimizeDeps: {
        exclude: ['@huggingface/transformers'],
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
