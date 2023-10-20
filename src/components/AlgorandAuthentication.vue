<script lang="ts">
import Button from 'primevue/button'
import Input from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'

import { defineComponent } from 'vue'

export interface INotification {
  severity: 'error' | 'success' | 'info' | 'warn' | undefined
  message: string
}
export default defineComponent({
  name: 'AlgorandAuthentication'
})
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Buffer } from 'buffer'
// import { NetworkId, WALLET_ID, WalletManager } from '@txnlab/use-wallet-js'
// const walletManager = new WalletManager({
//   wallets: [
//     WALLET_ID.DEFLY,
//     WALLET_ID.EXODUS,
//     WALLET_ID.MYALGO,
//     WALLET_ID.PERA
//     // {
//     //   id: WALLET_ID.WALLETCONNECT,
//     //   options: { projectId: '<YOUR_PROJECT_ID>' }
//     // }
//   ],
//   network: NetworkId.TESTNET
// })
import { AnyWalletState } from '@thencc/any-wallet'
import arc14 from '../scripts/arc14'
import { AlgorandAuthenticationStore } from '../store/AlgorandAuthenticationStore'
import algosdk from 'algosdk'

const props = defineProps({
  wallets: { type: Array<String>, required: true },
  useDemoMnemonics: { type: String, required: false, default: '' },
  algodHost: { type: String, required: true },
  algodToken: { type: String, required: false },
  algodPort: { type: Number, required: true }
})

const client = new algosdk.Algodv2(props.algodToken ?? '', props.algodHost, props.algodPort)

const awState = new AnyWalletState()
console.log('awState', awState)
const isAuthenticated = ref(false)
console.log('isAuthenticated', isAuthenticated)

interface IState {
  m: string
  email: string
  password: string
  password2: string
  name: string
  emailIsValid: boolean
  inRegistration: boolean
  inRegistrationToSign: boolean
  usignedTxs: Array<algosdk.Transaction>
  inSignature: boolean
}

const state = reactive<IState>({
  m: '',
  email: '',
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
interface Account {
  walletId: string
  name: string
  address: string
  chain: string
  active: boolean
  dateConnected: number
  dateLastActive?: number
}

async function connect(walletId: string) {
  try {
    const wallet = getWalletById(walletId)
    if (!wallet) {
      console.error(`Wallet ${walletId} not found`)
      return
    }
    console.log('before connect')
    AlgorandAuthenticationStore.wallet = wallet.id
    console.log('AlgorandAuthenticationStore.wallet', AlgorandAuthenticationStore.wallet)
    if (AlgorandAuthenticationStore.wallet == 'mnemonic') {
      console.log('state.m', state.m)
      if (!state.m) return
      awState.initWallet('mnemonic', state.m)
    }
    const accounts = (await wallet.connect()) as Account[]
    console.log('after connect', accounts)
    const params = await client.getTransactionParams().do()
    AlgorandAuthenticationStore.account = accounts[0].address
    const arc14Tx = arc14('Auth', AlgorandAuthenticationStore.account, params)

    const signed = await wallet.signTransactions([arc14Tx.toByte()])
    console.log('signed', signed)
    const header = `SigTx ${Buffer.from(signed[0]).toString('base64')}`
    console.log('header', header)
    AlgorandAuthenticationStore.count++
    AlgorandAuthenticationStore.arc14Header = header
    AlgorandAuthenticationStore.isAuthenticated = true
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
  }
  forceRender()
  handleOnStateChange()
}

const emit = defineEmits(['onStateChange', 'onNotification'])

const handleOnStateChange = () => {
  emit('onStateChange', AlgorandAuthenticationStore)
}
const handleOnNotification = (msg: INotification) => {
  emit('onNotification', msg)
}
async function sign(txs: Uint8Array[]): Promise<Uint8Array[]> {
  try {
    console.log('to sign', AlgorandAuthenticationStore.wallet)
    if (AlgorandAuthenticationStore.wallet == 'arc76') {
      return await signWithArc76(txs)
    }

    AlgorandAuthenticationStore.count++
    const wallet = Object.values(awState.allWallets).find(
      (w) => w.id == AlgorandAuthenticationStore.wallet
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
    console.log('to sign signWithArc76', AlgorandAuthenticationStore.wallet)
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

    const init = `ARC-0076-${state.email}-${state.password}-0-PBKDF2-999999`
    const salt = `ARC-0076-${state.email}-0-PBKDF2-999999`
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

    if (genAccount.addr != AlgorandAuthenticationStore.account) {
      console.error(
        `Password is invalid ${genAccount.addr} != ${AlgorandAuthenticationStore.account}`
      )

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
  AlgorandAuthenticationStore.count++
  AlgorandAuthenticationStore.arc14Header = ''
  AlgorandAuthenticationStore.isAuthenticated = false
  AlgorandAuthenticationStore.account = ''
  AlgorandAuthenticationStore.wallet = ''
  AlgorandAuthenticationStore.arc76email = ''
  state.m = ''
  state.email = ''
  return AlgorandAuthenticationStore
}
defineExpose({
  sign,
  logout
})

function testM() {
  state.m = props.useDemoMnemonics
  console.log('state.m', state.m)
}

function getWalletById(walletId: string) {
  const find = Object.values(awState.allWallets).find((w) => w.id == walletId)
  return find
}

async function authArc76Auth() {
  try {
    if (!window || !window.crypto || !window.crypto.subtle) {
      throw Error('Crypto API in browser is not available')
    }
    const init = `ARC-0076-${state.email}-${state.password}-0-PBKDF2-999999`
    const salt = `ARC-0076-${state.email}-0-PBKDF2-999999`
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
    AlgorandAuthenticationStore.count++
    AlgorandAuthenticationStore.account = genAccount.addr
    AlgorandAuthenticationStore.wallet = 'arc76'
    AlgorandAuthenticationStore.arc14Header = header
    AlgorandAuthenticationStore.isAuthenticated = true
    AlgorandAuthenticationStore.arc76email = state.email
    state.password = ''
    state.password2 = ''
  } catch (e: any) {
    handleOnNotification({ severity: 'error', message: e?.message })
  }
  forceRender()
  handleOnStateChange()
}

function checkEmailValidity() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  state.emailIsValid = emailRegex.test(state.email)
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
  <slot v-else-if="AlgorandAuthenticationStore.isAuthenticated"></slot>
  <div v-else class="wallets-page grid align-items-center w-auto flex-grow-1 p-0 m-0">
    <div class="col-12 md:col-6 xl:col-3 xl:col-offset-3">
      <div v-if="AlgorandAuthenticationStore.wallet == 'mnemonic'" class="wallet-settings">
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
            v-model="state.email"
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
          v-for="walletId in props.wallets"
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
