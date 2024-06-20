import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Connection } from 'typeorm';

import { RegisteredSenseFilesEntity } from '../../entity/registered-sense-files.entity';
import registeredSenseFilesService from '../../services/registered-sense-files.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function createRegisterSenseRawDataFile(id: string, data: string) {
  try {
    const dir = process.env.REGISTER_SENSE_DRAW_DATA_FOLDER;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFileSync(path.join(dir, `${id}.json`), data);
  } catch (error) {
    console.error(
      `create raw data of Register Sense file ${id} error: `,
      error,
    );
  }
}

export async function updateRegisteredSenseFiles(
  connection: Connection,
  startBlockHeight: number,
  endBlockHeight: number,
): Promise<void> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (startBlockHeight < hideToBlock || !openNodeApiURL || !startBlockHeight) {
    return;
  }
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
          startBlockHeight,
        );
      const senseEntity = {
        numberOfRegisteredSenseFingerprints:
          data.total_number_of_registered_sense_fingerprints -
          (previousSense?.totalNumberOfRegisteredSenseFingerprints || 0),
        totalNumberOfRegisteredSenseFingerprints:
          data.total_number_of_registered_sense_fingerprints,
        rawData: '',
        timestamp: data.as_of_timestamp * 1000,
      };
      await connection
        .getRepository(RegisteredSenseFilesEntity)
        .createQueryBuilder()
        .update(senseEntity)
        .where('blockHeight >= :startBlockHeight', { startBlockHeight })
        .andWhere('blockHeight <= :endBlockHeight', { endBlockHeight })
        .execute();
      for (let i = startBlockHeight; i <= endBlockHeight; i++) {
        await createRegisterSenseRawDataFile(
          i.toString(),
          JSON.stringify(data),
        );
      }
    }
  } catch (error) {
    console.error(
      `Updated Registered Sense Files (blockHeight: ${startBlockHeight} - ${endBlockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
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
    const senseEntity = {
      id: undefined,
      numberOfRegisteredSenseFingerprints: 0,
      totalNumberOfRegisteredSenseFingerprints: 0,
      blockHeight,
      blockTime,
      rawData: '',
      timestamp: Date.now(),
    };
    await connection
      .getRepository(RegisteredSenseFilesEntity)
      .save(senseEntity);
  } catch (error) {
    console.error(
      `Insert Registered Sense Files (blockHeight: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
