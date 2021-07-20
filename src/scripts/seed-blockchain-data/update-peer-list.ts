import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { PeerEntity } from '../../entity/peer.entity';
import geolocalisationService from '../../services/geolocalisation.service';
import peerService from '../../services/peer.service';

export async function updatePeerList(connection: Connection): Promise<void> {
  try {
    const dbPeers = await peerService.getAll();
    const [blockchainPeers]: PeerData[][] = await rpcClient.command([
      {
        method: 'getpeerinfo',
        parameters: [],
      },
    ]);

    const parsedBlockchainPeers = blockchainPeers.map<PeerData>(p => ({
      ...p,
      addr: p.addr.split(':')[0],
    }));

    const newPeers = await Promise.all(
      parsedBlockchainPeers
        .filter(p => !dbPeers.find(dbp => dbp.ip === p.addr))
        .map<Promise<PeerEntity>>(async p => {
          const geoData = await geolocalisationService.getGeoData(p.addr);

          return {
            ...geoData,
            nodeId: p.id,
            protocol: p.subver,
            version: p.version,
            ip: p.addr,
          };
        }),
    );
    const peersToRemove = dbPeers
      .filter(p => !parsedBlockchainPeers.find(bp => bp.addr === p.ip))
      .map(p => p.id);
    await connection.transaction(async entityManager => {
      if (peersToRemove.length > 0) {
        await entityManager.getRepository(PeerEntity).delete(peersToRemove);
      }
      if (newPeers.length > 0) {
        await entityManager.getRepository(PeerEntity).insert(newPeers);
      }
    });
  } catch (e) {
    console.error('Error Update peer list >>>', e);
  }
}
