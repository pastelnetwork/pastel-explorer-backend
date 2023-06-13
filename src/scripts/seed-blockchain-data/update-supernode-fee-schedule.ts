import axios from 'axios';
import { Connection } from 'typeorm';

import { SupernodeFeeScheduleEntity } from '../../entity/supernode-feeschedule';
import supernodeFeeScheduleService from '../../services/supernode-fee-schedule.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateSupernodeFeeSchedule(
  connection: Connection,
  blockHeight: number,
  blockHash: string,
  blockTime: number,
): Promise<void> {
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL || !blockHeight) {
    return;
  } else {
    try {
      const { data } = await axios.get<{
        fee_deflation_rate: number;
        fee_deflator_factor: number;
        pastelid_registration_fee: number;
        username_registration_fee: number;
        username_change_fee: number;
      }>(`${openNodeApiURL}/getfeeschedule`);
      if (data) {
        const item = await supernodeFeeScheduleService.getIdByBlockHeight(
          blockHeight,
        );
        const feeScheduleEntity = {
          id: item?.id || undefined,
          blockHeight,
          blockHash,
          blockTime: blockTime * 1000,
          feeDeflatorFactor:
            data?.fee_deflator_factor || data?.fee_deflation_rate || 0,
          pastelIdRegistrationFee: data?.pastelid_registration_fee || 0,
          usernameRegistrationFee: data?.username_registration_fee || 0,
          usernameChangeFee: data?.username_change_fee || 0,
          rawData: JSON.stringify(data),
          createdDate: Date.now(),
        };
        await connection
          .getRepository(SupernodeFeeScheduleEntity)
          .save(feeScheduleEntity);
      }
    } catch (error) {
      console.error(
        `Update supernode fee schedule (blockHeight: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
    }
  }
}
