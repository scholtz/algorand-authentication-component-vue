<script lang="ts">
import Button from 'primevue/button'
import Input from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'

import { defineComponent } from 'vue'
import { IState, Account, INotification } from '../types'
import { AuthenticationStore } from '../types'
import { AnyWalletState, W_ID } from '@thencc/any-wallet'
import { authStore } from '../store/authStore'

export default defineComponent({
  name: 'AlgorandAuthentication'
})
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Buffer } from 'buffer'

import arc14 from '../scripts/arc14'
import algosdk from 'algosdk'

const props = defineProps({
  wallets: { type: Array<String>, required: true },
  useDemoMnemonics: { type: String, required: false, default: '' },
  algodHost: { type: String, required: true },
  algodToken: { type: String, required: false },
  algodPort: { type: Number, required: true },
  store: { type: AuthenticationStore, required: true }
})

authStore.account = props.store.account
authStore.arc14Header = props.store.arc14Header
authStore.arc76email = props.store.arc76email
authStore.count = props.store.count
authStore.isAuthenticated = props.store.isAuthenticated
authStore.wallet = props.store.wallet
authStore.anyWallet = props.store.anyWallet ?? new AnyWalletState()

const client = new algosdk.Algodv2(props.algodToken ?? '', props.algodHost, props.algodPort)

console.log('awState', authStore.anyWallet)
const isAuthenticated = ref(false)
console.log('isAuthenticated', isAuthenticated)

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

//const connected = await init.connect()
//console.log('connected', connected)

const componentKey = ref(0)
const forceRender = () => {
  componentKey.value += 1
}

async function connect(walletId: string) {
  try {
    const wallet = getWalletById(walletId)
    if (!wallet) {
      console.error(`Wallet ${walletId} not found`)
      return
    }
    if (!authStore.anyWallet) return
    console.log('before connect')
    authStore.wallet = wallet.id
    console.log('store.wallet', authStore.wallet)
    if (authStore.wallet == 'mnemonic') {
      console.log('state.m', state.m)
      if (!state.m) return
      authStore.anyWallet.initWallet('mnemonic', state.m)
    }
    const accounts = (await wallet.connect()) as Account[]
    console.log('after connect', accounts)
    const params = await client.getTransactionParams().do()
    authStore.account = accounts[0].address
    const arc14Tx = arc14('Auth', authStore.account, params)

    const signed = await wallet.signTransactions([arc14Tx.toByte()])
    console.log('signed', signed)
    const header = `SigTx ${Buffer.from(signed[0]).toString('base64')}`
    console.log('header', header)
    authStore.count++
    authStore.arc14Header = header
    authStore.isAuthenticated = true
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
  }
  forceRender()
  handleOnStateChange()
}

const emit = defineEmits(['onStateChange', 'onNotification'])

const handleOnStateChange = () => {
  emit('onStateChange', authStore)
}
const handleOnNotification = (msg: INotification) => {
  emit('onNotification', msg)
}
async function sign(txs: Uint8Array[]): Promise<Uint8Array[]> {
  try {
    if (!authStore.anyWallet) return []
    console.log('to sign', authStore.wallet)
    if (authStore.wallet == 'arc76') {
      return await signWithArc76(txs)
    }

    authStore.count++
    const wallet = Object.values(authStore.anyWallet.allWallets).find(
      (w) => w.id == authStore.wallet
    )
    handleOnStateChange()
    const ret = await wallet?.signTransactions(txs)
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
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: Buffer.from(salt, 'utf-8'),
        iterations: iterations
      },
      cryptoKey,
      256
    )
    //console.log('masterBits', masterBits)
    const uint8 = new Uint8Array(masterBits)
    const mnemonic = algosdk.mnemonicFromSeed(uint8)
    const genAccount = algosdk.mnemonicToSecretKey(mnemonic)

    if (genAccount.addr != authStore.account) {
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
defineExpose({
  sign,
  logout
})

function testM() {
  state.m = props.useDemoMnemonics
  console.log('state.m', state.m)
}

interface IWallet {
  id: W_ID
  metadata: {
    name: string
    icon: string
  }
  connect: (p?: any) => Promise<Account[]>
  signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>
}
function getWalletById(walletId: string): IWallet | null {
  if (!authStore.anyWallet) return null
  const find = Object.values(authStore.anyWallet.allWallets).find((w) => w.id == walletId)
  return find as IWallet
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
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: Buffer.from(salt, 'utf-8'),
        iterations: iterations
      },
      cryptoKey,
      256
    )
    console.log('masterBits', masterBits)
    const uint8 = new Uint8Array(masterBits)
    const mnemonic = algosdk.mnemonicFromSeed(uint8)
    const genAccount = algosdk.mnemonicToSecretKey(mnemonic)

    const params = await client.getTransactionParams().do()
    const arc14Tx = arc14('Auth', genAccount.addr, params)

    const signed = arc14Tx.signTxn(genAccount.sk)
    console.log('signed', signed)
    const header = `SigTx ${Buffer.from(signed).toString('base64')}`
    console.log('header', header)
    authStore.count++
    authStore.account = genAccount.addr
    authStore.wallet = 'arc76'
    authStore.arc14Header = header
    authStore.isAuthenticated = true
    state.password = ''
    state.password2 = ''
    state.inRegistration = false
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
    v-if="state.inSignature"
    class="wallets-page grid align-items-center w-auto flex-grow-1 p-0 m-0"
  >
    <div class="col-12 md:col-6 xl:col-3 xl:col-offset-3">
      <div class="wallet-settings">
        <h3>Sign {{ state.usignedTxs.length }} transactions</h3>
        <label for="p">Password</label>
        <div>
          <Password
            type="password"
            placeholder="Please write your password"
            id="p"
            v-model="state.password"
            class="m-1 w-full"
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
  <slot v-else-if="authStore.isAuthenticated"></slot>
  <div
    v-else-if="authStore.anyWallet"
    class="wallets-page grid align-items-center w-auto flex-grow-1 p-0 m-0"
  >
    <div class="col-12 md:col-6 xl:col-3 xl:col-offset-3">
      <div v-if="authStore.wallet == 'mnemonic'" class="wallet-settings">
        <h3>Only for development purposes</h3>
        <label for="m">Mnemonics input</label>
        <div>
          <Password
            type="password"
            id="m"
            v-model="state.m"
            class="m-1 w-full"
            inputClass="w-full"
            toggleMask
            :feedback="false"
          />
        </div>
        <div>
          <Button @click="async () => await connect('mnemonic')" class="m-1">Connect</Button>
          <Button @click="testM" class="m-1" v-if="props.useDemoMnemonics"> Demo </Button>
        </div>
      </div>
      <div v-else class="wallet-settings">
        <h3>Sign in</h3>
        <label for="e" class="m-1">Email</label>
        <div>
          <Input
            id="e"
            type="email"
            v-model="authStore.arc76email"
            class="m-1 w-full"
            placeholder="Please write your email"
          />
        </div>
        <label for="p" class="m-1">Password</label>
        <div>
          <Password
            type="password"
            placeholder="Please write your password"
            id="p"
            v-model="state.password"
            class="m-1 w-full"
            toggleMask
            inputClass="w-full"
            :feedback="false"
          />
        </div>
        <div v-if="state.inRegistration">
          <label for="p2" class="m-1">Repeat password</label>
          <div>
            <Input
              type="password"
              id="p2"
              placeholder="Please repeat your password"
              v-model="state.password2"
              class="m-1 w-full"
              toggleMask
              inputClass="w-full"
            />
          </div>
          <Message severity="error" v-if="state.password && signInFormError()" class="m-3">{{
            signInFormError()
          }}</Message>
          <Button :disabled="!!signInFormError()" @click="authArc76Auth" class="m-1">
            Continue
          </Button>
          <Button @click="state.inRegistration = false" class="m-1" severity="secondary">
            Back to sign in
          </Button>
        </div>
        <div v-if="!state.inRegistration">
          <Message severity="error" v-if="state.password && signInFormError()" class="my-3 mx-1">{{
            signInFormError()
          }}</Message>
          <Button :disabled="!!signInFormError()" @click="authArc76Auth" class="m-1">
            Continue
          </Button>
          <Button @click="state.inRegistration = true" class="m-1" severity="secondary">
            New registration
          </Button>
        </div>
      </div>
    </div>
    <div class="col-12 md:col-6 xl:col-3" v-if="!state.inRegistration">
      <div class="wallet-options">
        <h3>Or use external wallet service</h3>
        <div
          v-for="walletId in authStore.anyWallet?.allWallets"
          :key="walletId.toString()"
          :class="componentKey"
          class="wallet-option"
          :title="getWalletById(walletId.toString())?.metadata.name"
        >
          <div :onclick="async () => await connect(walletId.toString())">
            <span class="wallet-name">{{ getWalletById(walletId.toString())?.metadata.name }}</span>
            <img
              class="wallet-icon"
              :src="getWalletById(walletId.toString())?.metadata.icon"
              :alt="getWalletById(walletId.toString())?.metadata.name"
              height="30"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
.wallets-page {
  background-size: cover;
  /*background-image: url('/auth-cover.jpg');*/
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
}
.wallet-options,
.wallet-settings {
  box-shadow: #ffe7c6 0px 48px 100px 0px;
  border-radius: 20px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.9);
}
.wallet-option {
  vertical-align: middle;
  margin: 10px 1px;
  display: flex;
  border-radius: 5pt;
  cursor: pointer;
}
.wallet-name {
  min-width: 10em;
  display: inline-block;
  padding: 1pt 2pt 1pt 4pt;
}
.wallet-icon {
  vertical-align: middle;
}
</style>
