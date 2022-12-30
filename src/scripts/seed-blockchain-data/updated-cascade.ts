import axios from 'axios';
import { decode } from 'js-base64';
import { Connection } from 'typeorm';

import { CascadeEntity } from '../../entity/cascade.entity';
import cascadeService from '../../services/cascade.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateCascade(
  connection: Connection,
  transactionId: string,
): Promise<boolean> {
  const pastelId = process.env.PASTELID;
  const passphrase = process.env.PASSPHRASE;
  const walletNodeApiURL = process.env.WALLETNODE_API_URL;

  if (!pastelId || !passphrase || !walletNodeApiURL) {
    return;
  } else {
    try {
      const { data } = await axios.get(
        `${walletNodeApiURL}/openapi/cascade/download`,
        {
          params: {
            pid: pastelId,
            txid: transactionId,
          },
          headers: {
            Authorization: passphrase,
          },
        },
      );
      const cascadeData = data?.file ? JSON.parse(decode(data.file)) : data;
      const existCascade = await cascadeService.getCascadeByTxId(transactionId);
      await connection.getRepository(CascadeEntity).save({
        id: existCascade?.id,
        cascadeId: !data?.file ? `nocascade_${Date.now()}` : '',
        transactionHash: transactionId,
        rawData: JSON.stringify(cascadeData),
        createdDate: !existCascade?.id ? Date.now() : undefined,
        lastUpdated: Date.now(),
      });
      return true;
    } catch (error) {
      console.error(
        `updated cascade error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
      return false;
    }
  }
}
