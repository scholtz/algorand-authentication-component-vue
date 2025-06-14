<script setup lang="ts">
//import Input from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'

import { INotification } from '../types'
import { authStore } from '../store/authStore'

import { ref, watch } from 'vue'
import { Buffer } from 'buffer'

import arc14 from '../scripts/arc14'
import algosdk from 'algosdk'
import { useNetwork, useWallet } from '@txnlab/use-wallet-vue'

const props = defineProps({
  useDemoMnemonics: { type: String, required: false, default: '' },
  arc14Realm: { type: String, required: true },
  class: { type: String, required: false },
  authorizedOnlyAccess: { type: Boolean, required: false, default: false }
})

const { activeAccount, wallets, activeWallet, transactionSigner } = useWallet()
const { activeNetworkConfig } = useNetwork()

let client = new algosdk.Algodv2(
  activeNetworkConfig.value.algod.token,
  activeNetworkConfig.value.algod.baseServer,
  activeNetworkConfig.value.algod.port,
  activeNetworkConfig.value.algod.headers
)
watch(
  () => activeNetworkConfig,
  () => {
    client = new algosdk.Algodv2(
      activeNetworkConfig.value.algod.token,
      activeNetworkConfig.value.algod.baseServer,
      activeNetworkConfig.value.algod.port,
      activeNetworkConfig.value.algod.headers
    )
    console.debug('activeNetworkConfig updated')
  }
)

const componentKey = ref(0)
const forceRender = () => {
  componentKey.value += 1
}

const emit = defineEmits(['onNotification'])

const handleOnNotification = (msg: INotification) => {
  emit('onNotification', msg)
}
function authArc76CancelSign() {
  authStore.inRegistrationToSign = true
  authStore.inArc76Signature = false
  authStore.inWalletSignature = false
  authStore.password = ''
}
async function signWithArc76() {
  try {
    const txs = authStore.usignedTxs
    console.log('to sign signWithArc76', txs, authStore.wallet)
    authStore.inArc76Signature = true
    authStore.inRegistrationToSign = false
    console.log('txs', txs)
    authStore.usignedTxs = txs.map((tx) => algosdk.decodeUnsignedTransaction(tx).toByte())
    console.log('tosign', authStore.usignedTxs)

    const init = `ARC-0076-${authStore.arc76email}-${authStore.password}-0-PBKDF2-999999`
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
    }
    //handleOnStateChange()
    const ret = authStore.usignedTxs.map((tx) =>
      algosdk.decodeUnsignedTransaction(tx).signTxn(genAccount.sk)
    )
    authStore.password = ''
    authStore.inArc76Signature = false
    authStore.inRegistrationToSign = false
    if (authStore.signaturePromise) {
      authStore.signaturePromise.resolve(ret)
    }
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
  }
}

function testM() {
  authStore.m = props.useDemoMnemonics
}

async function authUseWalletAuth() {
  try {
    if (!window || !window.crypto || !window.crypto.subtle) {
      throw Error('Crypto API in browser is not available')
    }
    console.log('activeAccount', activeAccount)
    if (!activeAccount.value || !activeAccount.value?.address) {
      throw Error('ActiveAccount is empty')
    }

    const params = await client.getTransactionParams().do()
    const arc14Tx = arc14(props.arc14Realm, activeAccount.value.address.toString(), params)
    authStore.inWalletSignature = true
    const signedList = await transactionSigner([arc14Tx], [0])
    if (signedList.length == 0) {
      throw Error('No transactions signed')
    }
    const signed = signedList[0]
    console.log('signed', signed)
    const header = `SigTx ${Buffer.from(signed).toString('base64')}`
    const tx = algosdk.decodeSignedTransaction(signed)

    console.log('header', header)
    authStore.count++
    authStore.account = tx.txn.sender.toString()
    authStore.wallet = activeWallet.value?.id ?? 'useWallet'
    authStore.arc14Header = header
    authStore.isAuthenticated = true
    authStore.arc76email = ''
    authStore.emailIsValid = false
    authStore.password = ''
    authStore.password2 = ''
    authStore.inRegistration = false
    authStore.inAuthentication = false
    authStore.inWalletSignature = false
    console.debug('authStore.wallet', authStore.wallet)
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
    authStore.inWalletSignature = false
  }
  forceRender()
  //handleOnStateChange()
}
async function authArc76Auth() {
  try {
    if (!window || !window.crypto || !window.crypto.subtle) {
      throw Error('Crypto API in browser is not available')
    }
    const init = `ARC-0076-${authStore.arc76email}-${authStore.password}-0-PBKDF2-999999`
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
    authStore.password = ''
    authStore.password2 = ''
    authStore.inRegistration = false
    authStore.inAuthentication = false
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
  }
  forceRender()
  //handleOnStateChange()
}

function checkEmailValidity() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  authStore.emailIsValid = emailRegex.test(authStore.arc76email)
}

function signInFormError() {
  checkEmailValidity()
  if (!authStore.emailIsValid) return 'Email is not valid'
  if (authStore.password.length <= 16) return 'Password must be at least 16 chars long'
  if (authStore.inRegistration) {
    if (authStore.password2 && authStore.password != authStore.password2)
      return 'Passwords do not match'
    if (authStore.password && !authStore.password2)
      return 'Please fill in the password confirmation field'
  }
  return
}
</script>

<template>
  <div
    class="flex flex-col min-h-screen w-full"
    :style="
      authStore.inWalletSignature ||
      authStore.inArc76Signature ||
      authStore.inAuthentication ||
      (props.authorizedOnlyAccess && !authStore.isAuthenticated) ||
      authStore.inRegistration
        ? 'display: none' // Hide slot content when in signature, authentication or registration. Do not use v-if as it would destroy the content
        : ''
    "
  >
    <slot></slot>
  </div>
  <div v-if="authStore.inWalletSignature" class="flex min-h-screen w-full wallets-page">
    <div class="items-center justify-center flex p-12 shadow-lg bg-white/50 w-full">
      <div class="wallet-settings w-1/2">
        <h3>Please check your wallet and sign the transaction</h3>
        <button
          @click="authArc76CancelSign"
          class="cursor-pointer my-2 mr-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
          severity="secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
  <div v-else-if="authStore.inArc76Signature" class="flex min-h-screen w-full wallets-page">
    <div class="items-center justify-center flex p-12 shadow-lg bg-white/50 w-full">
      <div class="wallet-settings w-1/2">
        <h3>Sign {{ authStore.usignedTxs.length }} transactions</h3>
        <label for="p">Password</label>
        <div>
          <input
            type="password"
            placeholder="Please write your password"
            id="p"
            v-model="authStore.password"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white/90 text-gray-700 p-2 cursor-pointer"
            toggleMask
            inputClass="w-full"
            :feedback="false"
          />
        </div>
        <button
          :disabled="!!signInFormError()"
          @click="signWithArc76"
          class="cursor-pointer my-2 mr-2 p-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          Continue
        </button>
        <button
          @click="authArc76CancelSign"
          class="cursor-pointer my-2 mr-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
          severity="secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
  <div
    v-else-if="
      authStore.inAuthentication || (props.authorizedOnlyAccess && !authStore.isAuthenticated)
    "
    class="flex min-h-screen w-full wallets-page flex-col md:flex-row"
  >
    <div
      class="items-center justify-center flex p-12 shadow-lg bg-white/50 min-h-screen"
      :class="authStore.inRegistration ? 'w-full' : 'w-full md:w-1/2'"
    >
      <div v-if="authStore.wallet == 'mnemonic'" class="wallet-settings">
        <h3>Only for development purposes</h3>
        <label for="m">Mnemonics input</label>
        <div>
          <Password
            type="password"
            id="m"
            v-model="authStore.m"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white/90 text-gray-700"
            inputClass="w-full"
            toggleMask
            :feedback="false"
          />
        </div>
        <div>
          <button
            @click="testM"
            class="cursor-pointer my-2 mr-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
            v-if="props.useDemoMnemonics"
          >
            Demo
          </button>
          <button
            @click="authStore.wallet = 'arc76'"
            class="cursor-pointer my-2 mr-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
          >
            Go back
          </button>
        </div>
      </div>
      <div v-else class="w-full max-w-sm space-y-6 bg-white p-6 rounded-lg shadow-md">
        <h3 class="text-2xl font-bold text-gray-800">
          {{ authStore.inRegistration ? 'Registration' : 'Sign in' }}
        </h3>
        <div>
          <label for="e" class="block text-sm font-medium text-gray-700">Email</label>

          <input
            id="e"
            type="email"
            v-model="authStore.arc76email"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 bg-white/90 text-gray-700"
            placeholder="Please write your email"
          />
        </div>
        <div>
          <label for="p" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            id="p"
            placeholder="Please write your password"
            v-model="authStore.password"
            class="cursor-pointer mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 bg-white/90 text-gray-700"
          />
        </div>
        <div v-if="authStore.inRegistration">
          <label for="p2" class="block text-sm font-medium text-gray-700">
            Password confirmation
          </label>
          <input
            type="password"
            id="p2"
            placeholder="Please repeat your password"
            v-model="authStore.password2"
            class="cursor-pointer mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 bg-white/90 text-gray-700"
          />
        </div>
        <div v-if="authStore.inRegistration">
          <div
            v-if="authStore.password && signInFormError()"
            class="my-3 p-2 bg-red-100 text-red-800 rounded-md"
          >
            {{ signInFormError() }}
          </div>
          <button
            :disabled="!!signInFormError()"
            @click="authArc76Auth"
            class="cursor-pointer w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Continue
          </button>
          <Button
            @click="authStore.inRegistration = false"
            class="cursor-pointer my-2 mr-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
            severity="secondary"
          >
            Back to sign in
          </Button>
        </div>
        <div v-if="!authStore.inRegistration">
          <Message
            severity="error"
            v-if="authStore.password && signInFormError()"
            class="my-3 mx-1"
            >{{ signInFormError() }}</Message
          >
          <button
            :disabled="!!signInFormError()"
            @click="authArc76Auth"
            class="cursor-pointer w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Continue
          </button>

          <div class="w-full flex">
            <button
              @click="authStore.inRegistration = true"
              class="cursor-pointer my-2 mr-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
              severity="secondary"
            >
              Register
            </button>
            <button
              @click="authStore.inAuthentication = false"
              class="cursor-pointer my-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="!authStore.inRegistration"
      class="w-full md:w-1/2 flex flex-col items-center justify-center p-12 shadow-lg bg-gray-900/80 text-white space-y-6"
    >
      <div class="wallet-options w-full lg:w-1/2">
        <h3>Or connect with</h3>
        <div v-if="activeAccount">
          <button
            @click="authUseWalletAuth"
            class="cursor-pointer bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 my-4 mr-4 p-2 px-4 w-full"
          >
            Sign authentication message
          </button>
          <button
            v-if="activeWallet"
            @click="activeWallet.disconnect"
            class="cursor-pointer py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900 my-4 mr-4 p-2 px-4 w-full"
          >
            Disconnect from {{ activeWallet?.metadata.name }}
          </button>
        </div>
        <div
          v-else
          v-for="wallet in wallets"
          :key="wallet.id"
          :class="componentKey"
          class="wallet-option py-2"
          :title="wallet.metadata.name"
        >
          <button
            class="cursor-pointer flex items-center w-full justify-center border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-100"
            v-if="wallet && !wallet.isActive && wallet.isConnected"
            @click="wallet.setActive()"
            :disabled="!wallet.isConnected || wallet.isActive"
          >
            <span class="wallet-name">{{ wallet.metadata.name }}</span>
            <img class="wallet-icon h-8" :src="wallet.metadata.icon" :alt="wallet.metadata.name" />
          </button>
          <button
            v-else
            @click="wallet.connect()"
            class="relative cursor-pointer flex items-center w-full border border-gray-300 rounded-md py-2 bg-gray-800/50 hover:bg-gray-700/50 px-4"
          >
            <img
              class="wallet-icon w-10 h-10 m-2"
              :src="wallet.metadata.icon"
              :alt="wallet.metadata.name"
              width="50"
              height="50"
            />

            <!-- Centered name using absolute positioning -->
            <span class="absolute left-1/2 transform -translate-x-1/2 wallet-name">
              {{ wallet.metadata.name }}
            </span>
          </button>
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
