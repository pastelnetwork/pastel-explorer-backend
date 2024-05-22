import axios from 'axios';
import { Connection } from 'typeorm';

import { RegisteredCascadeFilesEntity } from '../../entity/registered-cascade-files.entity';
import registeredCascadeFilesService from '../../services/registered-cascade-files.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateRegisteredCascadeFiles(
  connection: Connection,
  blockHeight: number,
  blockTime: number,
): Promise<void> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL) {
    return;
  } else {
    try {
      const { data } = await axios.get<{
        total_number_of_registered_cascade_files: number;
        data_size_bytes_counter: number;
        average_file_size_in_bytes: number;
        as_of_timestamp: number;
        as_of_datetime_utc_string: string;
      }>(
        `${openNodeApiURL}/get_current_total_number_and_size_and_average_size_of_registered_cascade_files`,
        {
          timeout: 50000,
        },
      );
      if (data) {
        const cascade =
          await registeredCascadeFilesService.getIdByBlockHeight(blockHeight);
        const previousCascade =
          await registeredCascadeFilesService.getPreviousRegisteredCascadeFileByBlockHeight(
            blockHeight,
          );
        const cascadeEntity = {
          numberOfRegistered:
            data.total_number_of_registered_cascade_files -
            (previousCascade?.totalNumberOfRegistered || 0),
          totalNumberOfRegistered:
            data.total_number_of_registered_cascade_files,
          dataSize:
            data.data_size_bytes_counter -
            (previousCascade?.dataSizeBytesCounter || 0),
          dataSizeBytesCounter: data.data_size_bytes_counter,
          averageFileSize:
            data.average_file_size_in_bytes -
            (previousCascade?.averageFileSizeInBytes || 0),
          averageFileSizeInBytes: data.average_file_size_in_bytes,
          blockHeight,
          blockTime,
          rawData: JSON.stringify(data),
          timestamp: data.as_of_timestamp * 1000,
        };
        if (cascade?.id) {
          await connection
            .getRepository(RegisteredCascadeFilesEntity)
            .createQueryBuilder()
            .update(cascadeEntity)
            .where({
              blockHeight,
            })
            .execute();
        } else {
          await connection
            .getRepository(RegisteredCascadeFilesEntity)
            .insert(cascadeEntity);
        }
      }
    } catch (error) {
      console.error(
        `Updated Registered Cascade Files (blockHeight: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
    }
  }
}
