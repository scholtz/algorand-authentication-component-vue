/// <reference types="vite/client" />

import algosdk from 'algosdk'

interface IAuthenticationStore {
  inAuthentication: boolean
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  account: string
  count: number
  arc76email: string
}

interface IState {
  m: string
  password: string
  password2: string
  name: string
  emailIsValid: boolean
  inRegistration: boolean
  inRegistrationToSign: boolean
  usignedTxs: Array<algosdk.Transaction>
  inSignature: boolean
}
interface Account {
  walletId: string
  name: string
  address: string
  chain: string
  active: boolean
  dateConnected: number
  dateLastActive?: number
}
interface INotification {
  severity: 'error' | 'success' | 'info' | 'warn' | undefined
  message: string
}
class AuthenticationStore {
  inAuthentication: boolean
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  account: string
  count: number
  arc76email: string
  constructor() {
    this.inAuthentication = false
    this.isAuthenticated = false
    this.arc14Header = ''
    this.count = 0
    this.wallet = ''
    this.account = ''
    this.arc76email = ''
  }
}
export { AuthenticationStore }
export type { IAuthenticationStore, IState, Account, INotification }
