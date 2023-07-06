import { Connection } from 'typeorm';

import { AddressEntity } from '../../entity/address.entity';
import addressEventsService from '../../services/address-events.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateAddress(
  connection: Connection,
  address: string,
  totalSent = 0,
  totalReceived = 0,
  direction = '',
): Promise<void> {
  try {
    const addressInfo = await addressEventsService.getInfoByAddress(address);
    const inComing = addressInfo.find(a => a.direction === 'Incoming');
    const outGoing = addressInfo.find(a => a.direction === 'Outgoing');
    let type = 'default';
    if (
      (addressInfo && !outGoing && inComing?.total < 5) ||
      (!addressInfo && direction === 'Incoming' && totalReceived < 5)
    ) {
      type = 'storage';
    }
    await connection.getRepository(AddressEntity).save({
      address,
      type,
      totalSent: outGoing?.total || totalSent || 0,
      totalReceived: inComing?.total || totalReceived || 0,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error(
      `Update address ${address} error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
