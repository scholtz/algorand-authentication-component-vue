import { reactive } from 'vue'
import { IAuthenticationStore } from '../types'
const defaultState: IAuthenticationStore = {
  inAuthentication: false,
  isAuthenticated: false,
  arc14Header: '',
  count: 0,
  wallet: '',
  account: '',
  arc76email: '',
  anyWallet: null
}
const authStore = reactive(defaultState)

export { authStore }
