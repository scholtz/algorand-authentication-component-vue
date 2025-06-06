import { reactive } from 'vue'
import { Deferred, IAuthenticationStore } from '../types'
const defaultState: IAuthenticationStore = {
  inAuthentication: false,
  isAuthenticated: false,
  arc14Header: '',
  count: 0,
  wallet: '',
  account: '',
  arc76email: '',
  m: '',
  password: '',
  password2: '',
  name: '',
  emailIsValid: false,
  inRegistration: false,
  inRegistrationToSign: false,
  usignedTxs: [] as Uint8Array[],
  inArc76Signature: false,
  inWalletSignature: false,
  signaturePromise: null as Deferred<Uint8Array[]> | null
}
const authStore = reactive(defaultState)

export { authStore }
