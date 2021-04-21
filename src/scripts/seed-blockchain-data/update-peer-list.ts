import axios from 'axios';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { PeerEntity } from '../../entity/peer.entity';
import peerService from '../../services/peer.service';

export async function updatePeers(connection: Connection): Promise<void> {
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
      .map<Promise<Omit<PeerEntity, 'id'>>>(async p => {
        const { data: geoData } = await axios.get<GeoApiData>(
          `https://www.iplocate.io/api/lookup/${p.addr}`,
        );
        return {
          city: geoData.city || 'N/A',
          country: geoData.country || 'N/A',
          latitude: geoData.latitude,
          longitude: geoData.longitude,
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
}
