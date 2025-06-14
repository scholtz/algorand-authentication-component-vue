import algosdk from 'algosdk'
import { authStore } from '../store/authStore'

import { IAuthenticationStore } from '../types'
import { createDeferred } from '../types'
const authenticate = () => {
  authStore.inAuthentication = true
  console.log('authStore.authenticate', authStore)
}
const logout = () => {
  authStore.count++
  authStore.arc14Header = ''
  authStore.isAuthenticated = false
  authStore.account = ''
  authStore.wallet = ''
  authStore.arc76email = ''
  authStore.m = ''
  console.log('authStore.logout', authStore)
}

const getTransactionSigner = (
  useWalletTransactionSigner: (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>
): ((txnGroup: algosdk.Transaction[], indexesToSign: number[]) => Promise<Uint8Array[]>) => {
  return async (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ): Promise<Uint8Array[]> => {
    if (authStore.wallet === 'arc76') {
      authStore.usignedTxs = txnGroup.map((txn) => algosdk.encodeUnsignedTransaction(txn))
      authStore.inArc76Signature = true
      authStore.signaturePromise = createDeferred<Uint8Array[]>()
      return await authStore.signaturePromise.promise
    } else {
      try {
        authStore.inWalletSignature = true
        const ret = await useWalletTransactionSigner(txnGroup, indexesToSign)
        authStore.inWalletSignature = false
        return ret
      } catch (error) {
        authStore.inWalletSignature = false
        console.error('Error during transaction signing:', error)
        throw error
      }
    }
  }
}

const sign = async (
  txnGroup: algosdk.Transaction[],
  indexesToSign: number[],
  transactionSigner: (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>
): Promise<Uint8Array[]> => {
  if (authStore.wallet == 'arc76') {
    authStore.usignedTxs = txnGroup.map((txn) => algosdk.encodeUnsignedTransaction(txn))
    authStore.inArc76Signature = true
    authStore.signaturePromise = createDeferred<Uint8Array[]>()
    return await authStore.signaturePromise.promise
  } else {
    try {
      authStore.inWalletSignature = true
      const ret = await transactionSigner(txnGroup, indexesToSign)
      authStore.inWalletSignature = false
      return ret
    } catch (error) {
      authStore.inWalletSignature = false
      console.error('Error during transaction signing:', error)
      throw error
    }
  }
}
export const useAVMAuthentication = (): {
  authStore: IAuthenticationStore
  authenticate: () => void
  logout: () => void
  sign: (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[],
    transactionSigner: (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ) => Promise<Uint8Array[]>
  ) => Promise<Uint8Array[]>
  getTransactionSigner: (
    useWalletTransactionSigner: (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ) => Promise<Uint8Array[]>
  ) => (txnGroup: algosdk.Transaction[], indexesToSign: number[]) => Promise<Uint8Array[]>
} => {
  return {
    authStore,
    authenticate,
    logout,
    sign,
    getTransactionSigner
  }
}
