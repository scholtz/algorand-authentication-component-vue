import { reactive } from 'vue'

export interface IAlgorandAuthenticationStore {
  isAuthenticated: boolean
  arc14Header: string
  wallet: string
  account: string
  count: number
  arc76email: string
}

export const AlgorandAuthenticationStore: IAlgorandAuthenticationStore = reactive({
  isAuthenticated: false,
  arc14Header: '',
  count: 0,
  wallet: '',
  account: '',
  arc76email: ''
})
