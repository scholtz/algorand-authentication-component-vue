/// <reference types="vite/client" />
declare const __APP_VERSION__: string
declare const IAlgorandAuthenticationStore: {
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  count: number
}

declare const AlgorandAuthentication: {}

declare module 'algorand-authentication-component-vue'
