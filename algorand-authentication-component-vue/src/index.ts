import AlgorandAuthentication from './components/AlgorandAuthentication.vue'

import type { IAuthenticationStore, Account, INotification } from './types'
export type { IAuthenticationStore, Account, INotification }

import { useAVMAuthentication } from './scripts/useAVMAuthentication'

export { AlgorandAuthentication, useAVMAuthentication }
