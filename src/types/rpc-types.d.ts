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

interface PeerData {
  id?: number;
  subver: string;
  version: number;
  addr: string;
}

interface GeoApiData {
  ip: string;
  country: string;
  country_code: string;
  city: string;
  continent: string;
  latitude: number;
  longitude: number;
  time_zone: string;
  postal_code: string;
}

interface GeoData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface MarketData {
  btcPrice: number;
  marketCapInUSD: number;
  usdPrice: number;
}

interface MarketApiData {
  market_data: {
    current_price: {
      usd: number;
      btc: number;
    };
    market_cap: {
      usd: number;
    };
  };
}
