/// <reference types="vite/client" />

import algosdk from 'algosdk'
import { AnyWalletState } from '@thencc/any-wallet'

interface IAuthenticationStore {
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  account: string
  count: number
  arc76email: string
  anyWallet: AnyWalletState | null
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
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  account: string
  count: number
  arc76email: string
  anyWallet: AnyWalletState | null
  constructor() {
    this.isAuthenticated = false
    this.arc14Header = ''
    this.count = 0
    this.wallet = ''
    this.account = ''
    this.arc76email = ''
    this.anyWallet = new AnyWalletState()
  }
}
export { AuthenticationStore }
export type { IAuthenticationStore, IState, Account, INotification }
