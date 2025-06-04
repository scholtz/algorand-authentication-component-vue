import { reactive } from 'vue'
import { IAuthenticationStore } from '../types'
const defaultState: IAuthenticationStore = {
  inAuthentication: true,
  isAuthenticated: false,
  arc14Header: '',
  count: 0,
  wallet: '',
  account: '',
  arc76email: ''
}
const authStore = reactive(defaultState)

export { authStore }
