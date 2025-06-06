<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import algosdk from 'algosdk'

import { useToast } from 'primevue/usetoast'
const toast = useToast()

import {
  AlgorandAuthentication,
  type INotification,
  useAVMAuthentication
} from 'algorand-authentication-component-vue'
import { Buffer } from 'buffer'
import { useWallet } from '@txnlab/use-wallet-vue'

const auth = useAVMAuthentication()
const { transactionSigner: useWalletTransactionSigner } = useWallet()

watch(
  () => auth.authStore,
  () => {
    console.log('authStore changed', auth.authStore)
  }
)

const state = reactive({
  thisPageRequiresAuthenticatedUser: false,
  lastSignedTransaction: ''
})

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

async function signTx() {
  const tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    amount: 0,
    sender: auth.authStore.account,
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
    receiver: auth.authStore.account
  })
  const signed = await auth.sign([tx], [0], useWalletTransactionSigner)
  state.lastSignedTransaction = Buffer.from(signed[0]).toString('base64')
  //const signed = await authComponent.value.sign([algosdk.encodeUnsignedTransaction(tx)])
  console.log('signed', signed)
}
async function logout() {
  const logout = await auth.logout()
  console.log('logout', logout)
}
const code = ref(
  `<script setup lang="ts">
  import {
    AlgorandAuthentication,
    type INotification,
    useAVMAuthentication
  } from 'algorand-authentication-component-vue'
  const auth = useAVMAuthentication()
</scr` +
    `ipt>

<temp` +
    `late>
  <AlgorandAuthentication
    @onNotification="onNotification"
    arc14Realm="Auth#ARC14"
    :authorizedOnlyAccess="state.thisPageRequiresAuthenticatedUser"
  >
    <div class="w-full m-12" v-if="!auth.authStore.isAuthenticated">
      <h1>Unauthenticated Content</h1>
      <button
        @click="auth.authenticate"
        class="cursor-pointer bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 my-4 p-2 px-4"
      >
        Login
      </button>
    </div>
    <div class="w-full m-12" v-if="!auth.authStore.isAuthenticated">
      Hello {{ auth.authStore.arc76email }}
    </div>
  </AlgorandAuthentication>
</tem` +
    `plate>`
)
</script>
<template>
  <div class="flex min-h-screen">
    <Toast />
    <AlgorandAuthentication
      @onNotification="onNotification"
      arc14Realm="Auth#ARC14"
      :authorizedOnlyAccess="state.thisPageRequiresAuthenticatedUser"
    >
      <div class="w-full m-12" v-if="!auth.authStore.isAuthenticated">
        <h1 class="font-bold">Unauthenticated Content</h1>
        <button
          @click="auth.authenticate"
          class="cursor-pointer bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 my-4 p-2 px-4"
        >
          Login
        </button>
        <p class="my-2">
          This is the demo app to show how to use the Algorand Authentication Component.
        </p>
        <pre><code class="language-vue">{{ code }}</code></pre>
      </div>
      <div class="w-full m-12" v-if="auth.authStore.isAuthenticated">
        <h1 class="font-bold">Authenticated Content</h1>
        <label class="block text-sm font-medium text-gray-700"> Email </label>
        <div class="my-4">
          {{ auth.authStore.arc76email }}
        </div>
        <label class="block text-sm font-medium text-gray-700"> Account </label>
        <div class="my-4">
          {{ auth.authStore.account }}
        </div>
        <label class="block text-sm font-medium text-gray-700"> Wallet provider </label>
        <div class="my-4">
          {{ auth.authStore.wallet }}
        </div>
        <label for="arc14Header" class="block text-sm font-medium text-gray-700">
          ARC14 Header
        </label>
        <textarea class="w-full my-4" id="arc14Header" :rows="5">{{
          auth.authStore.arc14Header
        }}</textarea>
        <div v-if="state.lastSignedTransaction">
          <label for="arc14Header" class="block text-sm font-medium text-gray-700">
            Last signed transaction
          </label>
          <textarea class="w-full my-4" id="arc14Header" :rows="5">{{
            state.lastSignedTransaction
          }}</textarea>
        </div>
        <button
          :onclick="signTx"
          class="cursor-pointer bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 my-4 mr-4 p-2 px-4"
        >
          Sign
        </button>
        <button
          :onclick="logout"
          class="cursor-pointer bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 m-4 p-2 px-4"
        >
          Logout
        </button>

        <button
          @click="
            state.thisPageRequiresAuthenticatedUser = !state.thisPageRequiresAuthenticatedUser
          "
          class="cursor-pointer bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 m-4 p-2 px-4"
        >
          {{ state.thisPageRequiresAuthenticatedUser ? 'Disable' : 'Enable' }} authentication
          requirement.. Currently: {{ state.thisPageRequiresAuthenticatedUser }}
        </button>
      </div>
    </AlgorandAuthentication>
  </div>
</template>
<style>
.wallets-page {
  background-size: cover;
  background-image: url('/auth-cover.jpg');
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
}
</style>
