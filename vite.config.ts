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
            // Tesseract OCR is only needed by the image-translation sheet, so
            // Vite keeps it in a separate lazy chunk loaded on demand.
            manualChunks: {
              tesseract: ['tesseract.js'],
            },
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
      },
    };
});
