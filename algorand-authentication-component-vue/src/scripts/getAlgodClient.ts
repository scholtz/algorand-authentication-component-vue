import algosdk, { Algodv2 } from 'algosdk'

const getAlgodClient = (): Algodv2 => {
  return new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443)
}
export default getAlgodClient
