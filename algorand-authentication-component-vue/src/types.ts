/// <reference types="vite/client" />
export type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

export function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve: resolve! }
}

interface IAuthenticationStore {
  inAuthentication: boolean
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  account: string
  count: number
  arc76email: string
  m: string
  password: string
  password2: string
  name: string
  emailIsValid: boolean
  inRegistration: boolean
  inRegistrationToSign: boolean
  usignedTxs: Uint8Array[]
  inArc76Signature: boolean
  inWalletSignature: boolean
  signaturePromise: null | Deferred<Uint8Array[]>
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
export type { IAuthenticationStore, Account, INotification }
