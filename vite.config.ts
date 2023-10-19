import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    emptyOutDir: true,
    sourcemap: true,

    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'algorand-authentication-component-vue',
      fileName: (format) => `algorand-authentication-component-vue.${format}.js`
    },
    rollupOptions: {
      external: [
        'vue',
        '@thencc/any-wallet',
        '@blockshake/defly-connect',
        '@perawallet/connect',
        '@randlabs/myalgo-connect',
        '@walletconnect/modal',
        '@walletconnect/sign-client',
        '@walletconnect/types',
        'algosdk'
      ],
      output: {
        globals: {
          vue: 'Vue',
          algosdk: 'algosdk',
          '@thencc/any-wallet': '@thencc/any-wallet'
        }
      }
    }
  },
  plugins: [vue()]
})
