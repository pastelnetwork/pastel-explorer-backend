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
  size: number;
  fee: number;
  blocktime: number;
  height: number;
  tickets: string;
  ticketsTotal: number;
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

interface IAppInfo {
  version: number;
  protocolversion: number;
  walletversion: number;
  balance: number;
  blocks: number;
  timeoffset: number;
  connections: number;
  proxy: string;
  difficulty: number;
  testnet: boolean;
  keypoololdest: number;
  keypoolsize: number;
  unlocked_until: number;
  paytxfee: number;
  relayfee: number;
  errors: string;
}

interface TicketData {
  height: number;
  txid: string;
  ticket: object;
}

interface ITicketsResponse {
  height: number;
  txid: string;
  ticket: {
    [key: string]: string | number;
  };
}

interface ITransactionTicketData {
  type: string;
  pastelID: string;
  height: number;
}

interface IBlockTicketData {
  type: string;
  pastelID: string;
  height: number;
  txid: string;
  actionType?: string;
}

interface INonZeroAddresses {
  account: string;
  sum: number;
}

interface ICollectionTicketsResponse {
  height: number;
  txid: string;
  tx_info?: {
    compressed_size: number;
    compression_ratio: string;
    is_compressed: boolean;
    size: number;
  };
  ticket: {
    collection_ticket: {
      app_ticket: string;
      blocknum: number;
      collection_final_allowed_block_height: number;
      collection_item_copy_count: number;
      collection_name: string;
      collection_ticket_version: number;
      creator: string;
      green: boolean;
      item_type: string;
      list_of_pastelids_of_authorized_contributors: string[];
      max_collection_entries: number;
      royalty: number;
    };
    creator_height: number;
    key: string;
    label: string;
    royalty_address: string;
    signatures: {
      mn1: {
        [key: string]: string;
      };
      mn2: {
        [key: string]: string;
      };
      mn3: {
        [key: string]: string;
      };
      principal: {
        [key: string]: string;
      };
    };
    storage_fee: number;
    type: string;
    version: number;
  };
}

interface IActionRegistrationTicket {
  height: number;
  txid: string;
  ticket: {
    type: string;
    action_ticket: string;
    action_type: string;
    version: number;
    signatures: {
      mn1: {
        [key: string]: string;
      };
      mn2: {
        [key: string]: string;
      };
      mn3: {
        [key: string]: string;
      };
      principal: {
        [key: string]: string;
      };
    };
    key: string;
    label: string;
    called_at: number;
    storage_fee: number;
  };
}

interface ITicketList {
  transactionHash: string;
  transactionTime: number;
}

interface CryptoCompareApiData {
  RAW: {
    PSL: {
      USD: {
        PRICE: number;
        CIRCULATINGSUPPLYMKTCAP: number;
      };
      BTC: {
        PRICE: number;
      };
    };
  };
}

interface ITransactionData {
  transactionHash: string;
  transactionTime: number;
  height: number;
}

interface GeoApiApiData {
  success: boolean;
  status: number;
  validationErr: boolean;
  message: string;
  ip: string;
  data: {
    range: number[];
    country: string;
    region: string;
    eu: string;
    timezone: string;
    city: string;
    ll: number[];
    metro: number;
    area: number;
  };
}
