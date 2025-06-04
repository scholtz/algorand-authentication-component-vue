<script setup lang="ts">
import { reactive, ref } from 'vue'
import algosdk from 'algosdk'

import { useToast } from 'primevue/usetoast'
const toast = useToast()
import Button from 'primevue/button'

import {
  AlgorandAuthentication,
  AuthenticationStore,
  type INotification,
  type IAuthenticationStore
} from 'algorand-authentication-component-vue'
import { Buffer } from 'buffer'

const store = new AuthenticationStore()

const defaultAuthState: IAuthenticationStore = {
  isAuthenticated: false,
  arc14Header: '',
  wallet: '',
  account: '',
  count: 0,
  arc76email: ''
}
const authState = reactive({
  isAuthenticated: defaultAuthState.isAuthenticated,
  arc14Header: defaultAuthState.arc14Header,
  wallet: defaultAuthState.wallet,
  account: defaultAuthState.account,
  count: defaultAuthState.count,
  arc76email: defaultAuthState.arc76email,
  anyWallet: defaultAuthState.anyWallet
})
store.anyWallet = authState.anyWallet

function onStateChange(e: IAuthenticationStore) {
  console.log('onStateChange', e)
  authState.isAuthenticated = e.isAuthenticated
  authState.arc14Header = e.arc14Header
  authState.wallet = e.wallet
  authState.account = e.account
  authState.count = e.count
  authState.arc76email = e.arc76email
  authState.anyWallet = e.anyWallet

  store.isAuthenticated = e.isAuthenticated
  store.arc14Header = e.arc14Header
  store.wallet = e.wallet
  store.account = e.account
  store.count = e.count
  store.arc76email = e.arc76email
  store.anyWallet = e.anyWallet
}
function onNotification(e: INotification) {
  try {
    if (e.severity == 'error') {
      console.error(e.message)
    } else {
      console.log('onNotification', e)
    }
    const ret = toast.add({
      severity: e.severity,
      detail: e.message,
      life: 5000
    })
    console.log('ret', ret)
  } catch (e: any) {
    console.error(e.message)
  }
}
console.log('AlgorandAuthentication', AlgorandAuthentication)
const authComponent = ref<InstanceType<typeof AlgorandAuthentication>>()

async function signTx() {
  if (!authComponent?.value) return

  const tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    amount: 0,
    sender: authState.account,
    suggestedParams: {
      fee: 0,
      minFee: 0,
      firstValid: 32961555n,
      genesisHash: new Uint8Array(
        Buffer.from('wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=', 'base64')
      ),
      genesisID: 'mainnet-v1.0',
      lastValid: 32962555,
      flatFee: true
    },
    receiver: authState.account
  })

  const signed = await authComponent.value.sign([algosdk.encodeUnsignedTransaction(tx)])
  console.log('signed', signed)
}
async function logout() {
  if (!authComponent?.value) return
  const logout = await authComponent.value.logout()
  console.log('logout', logout)
}
</script>
<template>
  <div class="flex min-h-screen">
    <Toast />
    <Suspense>
      <AlgorandAuthentication
        @onStateChange="onStateChange"
        @onNotification="onNotification"
        ref="authComponent"
        :wallets="['pera', 'exodus', 'defly', 'myalgo', 'mnemonic']"
        useDemoMnemonics="novel consider desert ribbon cage first audit couple discover seed text guard crater exchange roof stable march tortoise hockey magic dawn jacket cricket ability bright"
        algodHost="https://mainnet-api.algonode.cloud"
        :algodPort="443"
        :store="store"
      >
        <h1>Authenticated Content {{ authState.count }}</h1>
        <div>
          Account: {{ authState.arc76email }} {{ authState.wallet }} / {{ authState.account }}
        </div>
        <button :onclick="signTx">Sign</button>
        <button :onclick="logout">Logout</button>
      </AlgorandAuthentication>
    </Suspense>
  </div>
  <!-- <div class="flex min-h-screen">
    <div class="w-1/2 flex items-center justify-center bg-white/50 p-12 shadow-lg">
      <form class="w-full max-w-sm space-y-6">
        <h2 class="text-2xl font-bold text-gray-800">Sign In</h2>
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="********"
          />
        </div>
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>

    <div
      class="w-1/2 flex flex-col items-center justify-center bg-gray-500/50 bg-opacity-50 p-12 space-y-6"
    >
      <h2 class="text-2xl font-bold text-gray-800">Or connect with wallet</h2>
      <button
        class="flex items-center w-64 justify-center border border-gray-300 rounded-md py-2 hover:bg-gray-100"
      >
        <img src="https://perawallet.app/images/logo.svg" alt="Pera Wallet" class="w-6 h-6 mr-2" />
        <span>Connect with Pera Wallet</span>
      </button>
      <button
        class="flex items-center w-64 justify-center border border-gray-300 rounded-md py-2 hover:bg-gray-100"
      >
        <img
          src="https://via.placeholder.com/24x24?text=B"
          alt="Biatec Wallet"
          class="w-6 h-6 mr-2"
        />
        <span>Connect with Biatec Wallet</span>
      </button>
    </div>
  </div> -->
</template>
<style>
body {
  background-size: cover;
  background-image: url('/auth-cover.jpg');
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
}
</style>
