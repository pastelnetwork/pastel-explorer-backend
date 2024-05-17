import { Connection } from 'typeorm';

import registeredCascadeFilesService from '../../services/registered-cascade-files.service';
import registeredSenseFilesService from '../../services/registered-sense-files.service';
import supernodeFeeScheduleService from '../../services/supernode-fee-schedule.service';
import { updateRegisteredCascadeFiles } from './update-registered-cascade-files';
import { updateRegisteredSenseFiles } from './update-registered-sense-files';
import { updateSupernodeFeeSchedule } from './update-supernode-fee-schedule';

let isSyncSupernodeFeeSchedule = false;
export async function syncSupernodeFeeSchedule(connection: Connection) {
  if (isSyncSupernodeFeeSchedule) {
    return;
  }
  try {
    const processingTimeStart = Date.now();
    isSyncSupernodeFeeSchedule = true;
    const supernodeFeeData =
      await supernodeFeeScheduleService.getDataForUpdate();
    for (const item of supernodeFeeData) {
      await updateSupernodeFeeSchedule(
        connection,
        Number(item.blockHeight),
        item.id,
      );
    }
    console.log(
      `Processing update Supernode Fee Schedule finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
  } catch (error) {
    console.error('syncSupernodeFeeSchedule error:', error);
  }
  isSyncSupernodeFeeSchedule = false;
}

let isSyncRegisteredCascadeFiles = false;
export async function syncRegisteredCascadeFiles(connection: Connection) {
  if (isSyncRegisteredCascadeFiles) {
    return;
  }
  try {
    const processingTimeStart = Date.now();
    isSyncRegisteredCascadeFiles = true;
    const registeredCascadeFilesData =
      await registeredCascadeFilesService.getDataForUpdate();
    for (const item of registeredCascadeFilesData) {
      await updateRegisteredCascadeFiles(connection, Number(item.blockHeight));
    }
    console.log(
      `Processing update Registered Cascade Files finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
  } catch (error) {
    console.error('syncRegisteredCascadeFiles error:', error);
  }
  isSyncRegisteredCascadeFiles = false;
}

let isSyncRegisteredSenseFiles = false;
export async function syncRegisteredSenseFiles(connection: Connection) {
  if (isSyncRegisteredSenseFiles) {
    return;
  }
  try {
    const processingTimeStart = Date.now();
    isSyncRegisteredSenseFiles = true;
    const registeredSenseFilesData =
      await registeredSenseFilesService.getDataForUpdate();
    for (const item of registeredSenseFilesData) {
      await updateRegisteredSenseFiles(connection, Number(item.blockHeight));
    }
    console.log(
      `Processing update Registered Sense Files finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
  } catch (error) {
    console.error('syncRegisteredSenseFiles error:', error);
  }
  isSyncRegisteredSenseFiles = false;
}
