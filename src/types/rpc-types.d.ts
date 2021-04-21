declare enum TransferDirectionEnum {
  Incoming = 'Incoming',
  Outgoing = 'Outgoing',
}

interface BlockData {
  [k: string]: any;
  tx: string[];
  anchor: string;
  bits: string;
  chainwork: string;
  confirmations: number;
  difficulty: string;
  finalsaplingroot: string;
  hash: string;
  height: string;
  merkleroot: string;
  nextblockhash: string;
  nonce: string;
  previousblockhash: string;
  size: number;
  solution: string;
  time: number;
  transactions: TransactionData[];
}

interface ScriptSig {
  asm: string;
  hex: string;
}

interface Vin {
  coinbase: string;
  sequence: any;
  scriptSig: ScriptSig;
  txid: string;
  vout?: number;
}

interface ScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
}

interface Vout {
  value: number;
  valueZat: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

interface TransactionData {
  hex: string;
  txid: string;
  overwintered: boolean;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  vjoinsplit: any[];
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
}

interface AccountRankItem {
  account: string;
  sum: number;
}
