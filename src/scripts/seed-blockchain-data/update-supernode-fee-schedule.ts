import axios from 'axios';
import { Connection } from 'typeorm';

import { SupernodeFeeScheduleEntity } from '../../entity/supernode-feeschedule';
import supernodeFeeScheduleService from '../../services/supernode-fee-schedule.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateSupernodeFeeSchedule(
  connection: Connection,
  blockHeight: number,
  id: string,
): Promise<void> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL || !blockHeight) {
    return;
  } else {
    try {
      const latest = await supernodeFeeScheduleService.getLatest();
      let feeDeflatorFactor = 0;
      let pastelIdRegistrationFee = 0;
      let usernameRegistrationFee = 0;
      let usernameChangeFee = 0;
      let status = 0;
      let rawData = '';
      if (
        !latest?.blockHeight ||
        blockHeight === 1 ||
        blockHeight % 10000 === 0
      ) {
        const { data } = await axios.get<{
          fee_deflation_rate: number;
          fee_deflator_factor: number;
          pastelid_registration_fee: number;
          username_registration_fee: number;
          username_change_fee: number;
        }>(`${openNodeApiURL}/getfeeschedule`, {
          timeout: 50000,
        });

        feeDeflatorFactor =
          data?.fee_deflator_factor || data?.fee_deflation_rate || 0;
        pastelIdRegistrationFee = data?.pastelid_registration_fee || 0;
        usernameRegistrationFee = data?.username_registration_fee || 0;
        usernameChangeFee = data?.username_change_fee || 0;
        rawData = JSON.stringify(data);
        status = 1;
      } else {
        feeDeflatorFactor = latest.feeDeflatorFactor;
        pastelIdRegistrationFee = latest.pastelIdRegistrationFee;
        usernameRegistrationFee = latest.usernameRegistrationFee;
        usernameChangeFee = latest.usernameChangeFee;
        rawData = latest.rawData;
      }
      const feeScheduleEntity = {
        id,
        feeDeflatorFactor,
        pastelIdRegistrationFee,
        usernameRegistrationFee,
        usernameChangeFee,
        rawData,
        createdDate: Date.now(),
        status,
      };
      await connection
        .getRepository(SupernodeFeeScheduleEntity)
        .save(feeScheduleEntity);
    } catch (error) {
      console.error(
        `Update supernode fee schedule (blockHeight: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
    }
  }
}

export async function insertSupernodeFeeSchedule(
  connection: Connection,
  blockHeight: number,
  blockHash: string,
  blockTime: number,
): Promise<void> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
  try {
    const feeDeflatorFactor = 0;
    const pastelIdRegistrationFee = 0;
    const usernameRegistrationFee = 0;
    const usernameChangeFee = 0;
    const status = 0;
    const item =
      await supernodeFeeScheduleService.getIdByBlockHeight(blockHeight);
    const feeScheduleEntity = {
      id: item?.id || undefined,
      blockHeight,
      blockHash,
      blockTime: blockTime * 1000,
      feeDeflatorFactor,
      pastelIdRegistrationFee,
      usernameRegistrationFee,
      usernameChangeFee,
      rawData: '',
      createdDate: Date.now(),
      status,
    };
    await connection
      .getRepository(SupernodeFeeScheduleEntity)
      .save(feeScheduleEntity);
  } catch (error) {
    console.error(
      `Insert supernode fee schedule (blockHeight: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
