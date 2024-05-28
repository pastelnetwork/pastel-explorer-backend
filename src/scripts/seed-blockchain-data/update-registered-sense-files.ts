import axios from 'axios';
import { Connection } from 'typeorm';

import { RegisteredSenseFilesEntity } from '../../entity/registered-sense-files.entity';
import registeredSenseFilesService from '../../services/registered-sense-files.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateRegisteredSenseFiles(
  connection: Connection,
  blockHeight: number,
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
      const { data } = await axios.get<{
        total_number_of_registered_sense_fingerprints: number;
        as_of_timestamp: number;
        as_of_datetime_utc_string: string;
      }>(
        `${openNodeApiURL}/get_current_total_number_of_registered_sense_fingerprints`,
        {
          timeout: 50000,
        },
      );
      if (data) {
        const previousSense =
          await registeredSenseFilesService.getPreviousRegisteredSenseFileByBlockHeight(
            blockHeight,
          );
        const senseEntity = {
          numberOfRegisteredSenseFingerprints:
            data.total_number_of_registered_sense_fingerprints -
            (previousSense?.totalNumberOfRegisteredSenseFingerprints || 0),
          totalNumberOfRegisteredSenseFingerprints:
            data.total_number_of_registered_sense_fingerprints,
          rawData: JSON.stringify(data),
          timestamp: data.as_of_timestamp * 1000,
        };
        await connection
          .getRepository(RegisteredSenseFilesEntity)
          .createQueryBuilder()
          .update(senseEntity)
          .where({
            blockHeight,
          })
          .execute();
      }
    } catch (error) {
      console.error(
        `Updated Registered Sense Files (blockHeight: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
    }
  }
}

export async function insertRegisteredSenseFiles(
  connection: Connection,
  blockHeight: number,
  blockTime: number,
): Promise<void> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
  try {
    const sense =
      await registeredSenseFilesService.getIdByBlockHeight(blockHeight);
    const senseEntity = {
      numberOfRegisteredSenseFingerprints: 0,
      totalNumberOfRegisteredSenseFingerprints: 0,
      blockHeight,
      blockTime,
      rawData: '',
      timestamp: Date.now(),
    };
    if (sense?.id) {
      await connection
        .getRepository(RegisteredSenseFilesEntity)
        .createQueryBuilder()
        .update(senseEntity)
        .where({
          blockHeight,
        })
        .execute();
    } else {
      await connection
        .getRepository(RegisteredSenseFilesEntity)
        .insert(senseEntity);
    }
  } catch (error) {
    console.error(
      `Insert Registered Sense Files (blockHeight: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
