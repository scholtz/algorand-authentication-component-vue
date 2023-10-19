# Algorand authentication component vue

This component allows users to use ARC14 authentication with common algorand wallet providers or ARC76 email password account.

## Installation

Install NPM package:

```bash
npm i algorand-authentication-component-vue --save
```

Import component and/or types

```js
import { AlgorandAuthentication } from 'algorand-authentication-component-vue'
import type {IAlgorandAuthenticationStore,INotification} from 'algorand-authentication-component-vue'
```

Use in template

```vue
<Suspense>
  <AlgorandAuthentication
    @onStateChange="onStateChange"
    @onNotification="onNotification"
    ref="authComponent"
    :wallets="['pera', 'exodus', 'defly', 'myalgo', 'mnemonic']"
  >
    <h1>Authenticated Content {{ authState.count }}</h1>
    <div>
      Account: {{ authState.arc76email }} {{ authState.wallet }} / {{ authState.account }}
    </div>
    <button :onclick="signTx">Sign</button>
    <button :onclick="logout">Logout</button>
  </AlgorandAuthentication>
</Suspense>
```

## DEMO

Demo Project: https://www.npmjs.com/package/algorand-authentication-demo
