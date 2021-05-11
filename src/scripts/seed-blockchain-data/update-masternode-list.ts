import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { MasternodeEntity } from '../../entity/masternode.entity';
import geolocalisationService from '../../services/geolocalisation.service';
import masternodeService from '../../services/masternode.service';

type MasterNodeWithoutGeoData = Omit<
  MasternodeEntity,
  'latitude' | 'longitude' | 'city' | 'country'
>;
export async function updateMasternodeList(
  connection: Connection,
): Promise<void> {
  const dbMasternodes = await masternodeService.getAll();

  const [blockchainMasternodes]: Array<
    Record<string, string>
  > = await rpcClient.command([
    {
      method: 'masternodelist',
      parameters: ['full'],
    },
  ]);
  const parsedBlockchainMasternodes: Array<MasterNodeWithoutGeoData> = Object.keys(
    blockchainMasternodes,
  )
    .map<MasterNodeWithoutGeoData>(v => {
      const [
        status,
        n1, // eslint-disable-line @typescript-eslint/no-unused-vars
        publicKey,
        n2, // eslint-disable-line @typescript-eslint/no-unused-vars
        n3, // eslint-disable-line @typescript-eslint/no-unused-vars
        lastPaidTime,
        lastPaidBlock,
        ipAddr,
      ] = blockchainMasternodes[v].split(' ').filter(Boolean);
      const [ip, port] = ipAddr.split(':');
      return {
        ip,
        port,
        address: publicKey,
        lastPaidBlock: Number(lastPaidBlock),
        lastPaidTime: Number(lastPaidTime),
        status,
      };
    })
    .filter((v, idx, arr) => {
      const occurances = arr.filter((pbm: MasternodeEntity) => pbm.ip === v.ip)
        .length;

      return (
        occurances === 1 ||
        (occurances > 1 && v.status !== 'NEW_START_REQUIRED')
      );
    });

  const newMasternodes = await Promise.all(
    parsedBlockchainMasternodes
      .filter(p => !dbMasternodes.find(dmn => dmn.ip === p.ip))
      .map<Promise<MasternodeEntity>>(async p => {
        const geoData = await geolocalisationService.getGeoData(p.ip);
        return {
          ...p,
          ...geoData,
        };
      }),
  );
  const existingMasternodes = await Promise.all(
    parsedBlockchainMasternodes.filter(p =>
      dbMasternodes.find(dmn => dmn.ip === p.ip),
    ),
  );

  const masternodesToRemove = dbMasternodes
    .filter(p => !parsedBlockchainMasternodes.find(bmn => bmn.ip === p.ip))
    .map(p => p.id);

  await connection.transaction(async entityManager => {
    if (masternodesToRemove.length > 0) {
      await entityManager
        .getRepository(MasternodeEntity)
        .delete(masternodesToRemove);
    }
    if (newMasternodes.length > 0) {
      await entityManager
        .getRepository(MasternodeEntity)
        .insert(newMasternodes);
    }
    await Promise.all(
      existingMasternodes.map(mn =>
        entityManager
          .createQueryBuilder()
          .update(MasternodeEntity)
          .set({
            lastPaidBlock: mn.lastPaidBlock,
            lastPaidTime: mn.lastPaidTime,
            status: mn.status,
          })
          .where('ip = :ip', { ip: mn.ip })
          .execute(),
      ),
    );
  });
}
