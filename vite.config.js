import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss' // <-- Import
import autoprefixer from 'autoprefixer' // <-- Import

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: { // <-- Add this
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
})