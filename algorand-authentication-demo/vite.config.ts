import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteCompression(),
    tailwindcss(),
    AutoImport({
      resolvers: [PrimeVueResolver()]
    }),
    Components({
      resolvers: [PrimeVueResolver()]
    })
  ],
  build: { cssCodeSplit: true, sourcemap: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
