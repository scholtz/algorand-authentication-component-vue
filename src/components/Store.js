import { reactive } from 'vue'

export const AlgorandAuthenticationStore = reactive({
  isAuthenticated: false,
  arc14Header: '',
  wallet: '',
  count: 0
})
