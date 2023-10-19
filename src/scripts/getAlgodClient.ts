import algosdk from 'algosdk'
import type AlgodClient from 'algosdk/dist/types/client/v2/algod/algod'

const getAlgodClient = (): AlgodClient => {
  return new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
}
export default getAlgodClient
