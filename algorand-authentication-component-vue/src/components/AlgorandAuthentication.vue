<script setup lang="ts">
import Button from 'primevue/button'
//import Input from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'

import { IState, INotification } from '../types'
import { AuthenticationStore } from '../types'
import { authStore } from '../store/authStore'

import { reactive, ref } from 'vue'
import { Buffer } from 'buffer'

import arc14 from '../scripts/arc14'
import algosdk from 'algosdk'
import { useWallet } from '@txnlab/use-wallet-vue'

const props = defineProps({
  wallets: { type: Array<String>, required: true },
  useDemoMnemonics: { type: String, required: false, default: '' },
  arc14Realm: { type: String, required: true },
  algodHost: { type: String, required: true },
  algodToken: { type: String, required: false },
  algodPort: { type: Number, required: true },
  store: { type: AuthenticationStore, required: true },
  class: { type: String, required: false }
})

authStore.account = props.store.account
authStore.arc14Header = props.store.arc14Header
authStore.arc76email = props.store.arc76email
authStore.count = props.store.count
authStore.isAuthenticated = props.store.isAuthenticated
authStore.wallet = props.store.wallet

const client = new algosdk.Algodv2(props.algodToken ?? '', props.algodHost, props.algodPort)

const { activeAccount, transactionSigner, wallets, activeWallet } = useWallet()
const state = reactive<IState>({
  m: '',
  password: '',
  password2: '',
  name: '',
  emailIsValid: false,
  inRegistration: false,
  inRegistrationToSign: false,
  usignedTxs: [],
  inSignature: false
})

const componentKey = ref(0)
const forceRender = () => {
  componentKey.value += 1
}
/*
async function connect(walletId: string) {
  try {
    const wallet = getWalletById(walletId)
    if (!wallet) {
      console.error(`Wallet ${walletId} not found`)
      return
    }
    console.log('before connect')
    authStore.wallet = wallet.id
    console.log('store.wallet', authStore.wallet)
    if (authStore.wallet == 'mnemonic') {
      console.log('state.m', state.m)
      if (!state.m) return
    }
    const accounts = (await wallet.connect()) as Account[]
    console.log('after connect', accounts)
    const params = await client.getTransactionParams().do()
    authStore.account = accounts[0].address
    const arc14Tx = arc14(props.arc14Realm, authStore.account, params)

    const signed = await wallet.signTransactions([arc14Tx.toByte()])
    console.log('signed', signed)
    const header = `SigTx ${Buffer.from(signed[0]).toString('base64')}`
    console.log('header', header)
    authStore.count++
    authStore.arc14Header = header
    authStore.isAuthenticated = true
    authStore.inAuthentication = false
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
  }
  forceRender()
  handleOnStateChange()
}*/

const emit = defineEmits(['onStateChange', 'onNotification'])

const handleOnStateChange = () => {
  emit('onStateChange', authStore)
}
const handleOnNotification = (msg: INotification) => {
  emit('onNotification', msg)
}
async function sign(txs: Uint8Array[]): Promise<Uint8Array[]> {
  try {
    console.log('to sign', authStore.wallet)
    if (authStore.wallet == 'arc76') {
      return await signWithArc76(txs)
    }

    authStore.count++

    handleOnStateChange()
    const indexes: number[] = []
    for (let index = 0; index < txs.length; index++) {
      const decoded = algosdk.decodeUnsignedTransaction(txs[index])
      if (decoded.sender.toString() == activeAccount.value?.address.toString()) {
        indexes.push(index)
      }
    }
    const ret = await transactionSigner(
      txs.map((tx) => algosdk.decodeUnsignedTransaction(tx)),
      indexes
    )
    if (!ret) return []
    return ret
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
    return []
  }
}
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))
function authArc76Sign2() {
  state.inRegistrationToSign = true
}
function authArc76CancelSign() {
  state.inRegistrationToSign = true
  state.inSignature = false
  state.password = ''
}
async function signWithArc76(txs: Uint8Array[]): Promise<Uint8Array[]> {
  try {
    console.log('to sign signWithArc76', authStore.wallet)
    state.inSignature = true
    state.inRegistrationToSign = false
    console.log('txs', txs)
    state.usignedTxs = txs.map((tx) => algosdk.decodeUnsignedTransaction(tx))
    console.log('tosign', state.usignedTxs)
    while (!state.inRegistrationToSign) {
      console.log('Waiting for user to input password')
      await delay(1000) // wait until user clicks on button to sign
    }
    if (!state.inSignature) {
      // on cancel the state.inSignature = false, state.inRegistrationToSign = true
      return []
    }

    const init = `ARC-0076-${authStore.arc76email}-${state.password}-0-PBKDF2-999999`
    const salt = `ARC-0076-${authStore.arc76email}-0-PBKDF2-999999`
    const iterations = 999999
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      Buffer.from(init, 'utf-8'),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )
    const masterBits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(salt, 'utf-8'), iterations: iterations },
      cryptoKey,
      256
    )
    //console.log('masterBits', masterBits)
    const uint8 = new Uint8Array(masterBits)
    const mnemonic = algosdk.mnemonicFromSeed(uint8)
    const genAccount = algosdk.mnemonicToSecretKey(mnemonic)

    if (genAccount.addr.toString() != authStore.account.toString()) {
      console.error(`Password is invalid ${genAccount.addr} != ${authStore.account}`)

      handleOnNotification({ severity: 'error', message: 'Password is invalid' })
      return await signWithArc76(txs)
    }
    handleOnStateChange()
    const ret = state.usignedTxs.map((tx) => tx.signTxn(genAccount.sk))
    state.password = ''
    state.inSignature = false
    state.inRegistrationToSign = false
    return ret
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
    return []
  }
}

function logout() {
  authStore.count++
  authStore.arc14Header = ''
  authStore.isAuthenticated = false
  authStore.account = ''
  authStore.wallet = ''
  authStore.arc76email = ''
  state.m = ''
  return authStore
}
defineExpose({ sign, logout, auth })
/**
 * Show auth screen.
 *
 * This method is exposed, so users can call it
 * @param email Optional parameter is email
 */
function auth(email: string | undefined) {
  if (email) {
    authStore.arc76email = email
  }
  authStore.inAuthentication = true
  handleOnStateChange()
}
function testM() {
  state.m = props.useDemoMnemonics
}

async function authArc76Auth() {
  try {
    if (!window || !window.crypto || !window.crypto.subtle) {
      throw Error('Crypto API in browser is not available')
    }
    const init = `ARC-0076-${authStore.arc76email}-${state.password}-0-PBKDF2-999999`
    const salt = `ARC-0076-${authStore.arc76email}-0-PBKDF2-999999`
    const iterations = 999999
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      Buffer.from(init, 'utf-8'),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )
    const masterBits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(salt, 'utf-8'), iterations: iterations },
      cryptoKey,
      256
    )
    console.log('masterBits', masterBits)
    const uint8 = new Uint8Array(masterBits)
    const mnemonic = algosdk.mnemonicFromSeed(uint8)
    const genAccount = algosdk.mnemonicToSecretKey(mnemonic)

    const params = await client.getTransactionParams().do()
    const arc14Tx = arc14(props.arc14Realm, genAccount.addr.toString(), params)

    const signed = arc14Tx.signTxn(genAccount.sk)
    console.log('signed', signed)
    const header = `SigTx ${Buffer.from(signed).toString('base64')}`
    console.log('header', header)
    authStore.count++
    authStore.account = genAccount.addr.toString()
    authStore.wallet = 'arc76'
    authStore.arc14Header = header
    authStore.isAuthenticated = true
    state.password = ''
    state.password2 = ''
    state.inRegistration = false
    authStore.inAuthentication = false
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
  }
  forceRender()
  handleOnStateChange()
}

function checkEmailValidity() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  state.emailIsValid = emailRegex.test(authStore.arc76email)
}

function signInFormError() {
  checkEmailValidity()
  if (!state.emailIsValid) return 'Email is not valid'
  if (state.password.length <= 16) return 'Password must be at least 16 chars long'
  if (state.inRegistration) {
    if (state.password != state.password2) return 'Passwords do not match'
  }
  return
}
</script>

<template>
  <div
    :style="state.inSignature || authStore.inAuthentication ? 'display:none' : ''"
    :class="state.inSignature || authStore.inAuthentication ? 'hidden ' + props.class : props.class"
  >
    <slot></slot>
  </div>
  <div v-if="state.inSignature" class="wallets-page grid items-center w-auto flex-grow p-0 m-0">
    <div class="col-span-12 md:col-span-6 xl:col-span-4 xl:col-start-3">
      <div class="wallet-settings">
        <h3>Sign {{ state.usignedTxs.length }} transactions</h3>
        <label for="p">Password</label>
        <div>
          <Password
            type="password"
            placeholder="Please write your password"
            id="p"
            v-model="state.password"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            toggleMask
            inputClass="w-full"
            :feedback="false"
          />
        </div>
        <Button :disabled="!!signInFormError()" @click="authArc76Sign2" class="m-1">
          Continue
        </Button>
        <Button @click="authArc76CancelSign" class="m-1" severity="secondary"> Cancel </Button>
      </div>
    </div>
  </div>

  <div v-else-if="authStore.inAuthentication" class="flex min-h-screen w-full wallets-page">
    <div class="w-1/2 items-center justify-center flex p-12 shadow-lg bg-white/50">
      <div v-if="authStore.wallet == 'mnemonic'" class="wallet-settings">
        <h3>Only for development purposes</h3>
        <label for="m">Mnemonics input</label>
        <div>
          <Password
            type="password"
            id="m"
            v-model="state.m"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            inputClass="w-full"
            toggleMask
            :feedback="false"
          />
        </div>
        <div>
          <Button @click="testM" class="m-1" v-if="props.useDemoMnemonics"> Demo </Button>
          <Button @click="authStore.wallet = 'arc76'" class="m-1">Go back</Button>
        </div>
      </div>
      <div v-else class="w-full max-w-sm space-y-6">
        <h3 class="text-2xl font-bold text-gray-800">Sign in</h3>
        <div>
          <label for="e" class="block text-sm font-medium text-gray-700">Email</label>

          <input
            id="e"
            type="email"
            v-model="authStore.arc76email"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            style="padding: 4px"
            placeholder="Please write your email"
          />
        </div>
        <div>
          <label for="p" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            style="padding: 4px"
            type="password"
            placeholder="Please write your password"
            id="p"
            v-model="state.password"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            toggleMask
            inputClass="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            :feedback="false"
          />
        </div>
        <div v-if="state.inRegistration">
          <label for="p2" class="m-1">Repeat password</label>
          <div>
            <input
              style="padding: 4px"
              type="password"
              id="p2"
              placeholder="Please repeat your password"
              v-model="state.password2"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              toggleMask
              inputClass="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Message severity="error" v-if="state.password && signInFormError()" class="m-3">{{
            signInFormError()
          }}</Message>
          <button
            :disabled="!!signInFormError()"
            @click="authArc76Auth"
            class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Continue
          </button>
          <Button @click="state.inRegistration = false" class="m-1" severity="secondary">
            Back to sign in
          </Button>
        </div>
        <div v-if="!state.inRegistration">
          <Message severity="error" v-if="state.password && signInFormError()" class="my-3 mx-1">{{
            signInFormError()
          }}</Message>
          <button
            :disabled="!!signInFormError()"
            @click="authArc76Auth"
            class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Continue
          </button>
          <div class="grid grid-cols-2 gap-4 w-full">
            <button
              @click="state.inRegistration = true"
              class="m-2 py-2 rounded-md"
              severity="secondary"
            >
              Register
            </button>
            <button @click="authStore.inAuthentication = false" class="m-1">Go back</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!state.inRegistration" class="w-1/2 flex flex-col p-12 shadow-lg bg-gray-500/50">
      <div class="wallet-options">
        <h3>Or connect with wallet</h3>
        <div v-if="activeAccount">
          <button @click="activeWallet?.disconnect()">
            Disconnect from {{ activeWallet?.metadata.name }}
          </button>
        </div>
        <div
          v-else
          v-for="wallet in wallets"
          :key="wallet.id"
          :class="componentKey"
          class="wallet-option"
          :title="wallet.metadata.name"
        >
          <div
            v-if="wallet && !wallet.isActive && wallet.isConnected"
            @click="wallet.setActive()"
            :disabled="!wallet.isConnected || wallet.isActive"
          >
            <span class="wallet-name">{{ wallet.metadata.name }}</span>
            <img class="wallet-icon h-8" :src="wallet.metadata.icon" :alt="wallet.metadata.name" />
          </div>
          <div v-else @click="wallet.connect()">
            <span class="wallet-name">{{ wallet.metadata.name }}</span>
            <img
              class="wallet-icon h-8"
              :src="wallet.metadata.icon"
              :alt="wallet.metadata.name"
              width="50"
              height="50"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
.a {
  background-color: #f0f0f0;
}
</style>
