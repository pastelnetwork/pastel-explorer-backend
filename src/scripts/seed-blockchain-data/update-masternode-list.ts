import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { MasternodeEntity } from '../../entity/masternode.entity';
import geolocalisationService from '../../services/geolocalisation.service';
import masternodeService from '../../services/masternode.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat } from '../../utils/helpers';

type MasterNodeWithoutGeoData = Omit<
  MasternodeEntity,
  'latitude' | 'longitude' | 'city' | 'country'
>;

type TExtra = {
  extAddress: string;
  extP2P: string;
  extKey: string;
  extCfg: string;
  eligibleForMining: boolean;
};

export async function updateMasternodeList(
  connection: Connection,
): Promise<void> {
  try {
    const dbMasternodes = await masternodeService.getAll();

    const [blockchainMasternodes]: Array<Record<string, string>> =
      await rpcClient.command([
        {
          method: 'masternodelist',
          parameters: ['full'],
        },
      ]);

    const [masternodeListRank]: Array<Record<string, string>> =
      await rpcClient.command([
        {
          method: 'masternodelist',
          parameters: ['rank'],
        },
      ]);

    const [masternodeListPubkey]: Array<Record<string, string>> =
      await rpcClient.command([
        {
          method: 'masternodelist',
          parameters: ['pubkey'],
        },
      ]);
    const [masternodesListExtra]: Array<Record<string, TExtra>> =
      await rpcClient.command([
        {
          method: 'masternodelist',
          parameters: ['extra'],
        },
      ]);

    const parsedBlockchainMasternodes: Array<MasterNodeWithoutGeoData> =
      Object.keys(blockchainMasternodes)
        .map<MasterNodeWithoutGeoData>(v => {
          const [
            status,
            n1,
            publicKey,
            n2,
            n3,
            lastPaidTime,
            lastPaidBlock,
            ipAddr,
          ] = blockchainMasternodes[v].split(' ').filter(Boolean);

          const [ip, port] = ipAddr.split(':');
          const extra = masternodesListExtra[v] as TExtra;

          return {
            ip,
            port,
            address: publicKey,
            lastPaidBlock: Number(lastPaidBlock),
            lastPaidTime: Number(lastPaidTime),
            status,
            masternodecreated: null,
            protocolVersion: Number(n1),
            dateTimeLastSeen: Number(n2),
            activeSeconds: Number(n3),
            snPastelIdPubkey: extra?.extKey || '',
            extAddress: extra?.extAddress || '',
            extP2P: extra?.extP2P || '',
            pubkey: masternodeListPubkey[v] || '',
            masternodeRank: Number(masternodeListRank[v]) || -1,
            rankAsOfBlockHeight: -1,
          };
        })
        .filter((v, idx, arr) => {
          const occurances = arr.filter(
            (pbm: MasternodeEntity) => pbm.ip === v.ip,
          ).length;

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
          const created = await transactionService.getMasternodeCreated(
            p.address,
          );
          return {
            ...p,
            ...geoData,
            masternodecreated: created,
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
        existingMasternodes.map(async mn => {
          const created = await transactionService.getMasternodeCreated(
            mn.address,
          );
          return entityManager
            .createQueryBuilder()
            .update(MasternodeEntity)
            .set({
              ...mn,
              masternodecreated: created,
            })
            .where('ip = :ip', { ip: mn.ip })
            .execute();
        }),
      );
    });
  } catch (e) {
    console.error(
      `Error updateMasternodeList >>> ${getDateErrorFormat()} >>>`,
      e,
    );
  }
}
