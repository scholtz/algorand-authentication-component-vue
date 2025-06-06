import algosdk from 'algosdk'
import { Buffer } from 'buffer'

const arc14 = (realm: string, signerAddr: string, params: algosdk.SuggestedParams) => {
  const arc14Tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: signerAddr,
    receiver: signerAddr,
    amount: 0,
    note: new Uint8Array(Buffer.from(realm + '#ARC14')),
    suggestedParams: { ...params, fee: 0, flatFee: true }
  })
  return arc14Tx
}
export default arc14
