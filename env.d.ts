/// <reference types="vite/client" />

declare module 'algorand-authentication-component-vue'

export interface INotification {
  severity: string
  message: string
}

export interface IAlgorandAuthenticationStore {
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  account: string
  count: number
  arc76email: string
}
