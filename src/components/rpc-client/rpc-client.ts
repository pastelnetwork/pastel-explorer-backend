import BitcoinClient from 'bitcoin-core';

type RPCCommand = {
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: any[];
};
interface BitcoinCore {
  command: <T>(args: RPCCommand[]) => Promise<T>;
}

class RPCClient {
  public client: BitcoinCore;

  constructor() {
    this.client = new BitcoinClient({
      host: process.env.RPC_HOST,
      port: process.env.RPC_PORT,
      username: process.env.RPC_USERNAME,
      password: process.env.RPC_PASSWORD,
    });
  }
}

export default new RPCClient().client;
