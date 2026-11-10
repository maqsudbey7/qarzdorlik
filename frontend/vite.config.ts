import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api so‘rovlari Qarz daftar backend'iga (localhost:8001) yo‘naltiriladi
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': 'http://localhost:8001' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@reduxjs/toolkit', 'react-redux', '@tanstack/react-query'],
          motion: ['motion'],
        },
      },
    },
  },
});
