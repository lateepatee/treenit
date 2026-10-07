import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Suhteelliset polut, jotta build toimii sekä juuressa että GitHub Pagesin alikansiossa.
  base: './',
});
