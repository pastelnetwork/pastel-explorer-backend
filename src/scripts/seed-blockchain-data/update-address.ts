import { Connection } from 'typeorm';

import { AddressEntity } from '../../entity/address.entity';
import addressEventsService from '../../services/address-events.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateAllAddress(connection: Connection): Promise<void> {
  const STORAGE_ADDRESS_COUNT = process.env.STORAGE_ADDRESS_COUNT;
  const STORAGE_ADDRESS_AMOUNT = process.env.STORAGE_ADDRESS_AMOUNT;
  if (!STORAGE_ADDRESS_COUNT || !STORAGE_ADDRESS_AMOUNT) {
    return;
  }
  try {
    const allAddress = await addressEventsService.getAllAddress();
    const addresses = [];
    for (let i = 0; i < allAddress.length; i++) {
      if (!addresses.includes(allAddress[i].address)) {
        try {
          console.log(`Processing address ${allAddress[i].address}`);
          const totalTransaction =
            await addressEventsService.getTransactionStorageAddressByAddress(
              Number(STORAGE_ADDRESS_AMOUNT),
              allAddress[i].address,
            );
          const incomingAddress = allAddress.find(
            a =>
              a.address === allAddress[i].address && a.direction === 'Incoming',
          );
          const outgoingAddress = allAddress.find(
            a =>
              a.address === allAddress[i].address && a.direction === 'Outgoing',
          );

          await connection.getRepository(AddressEntity).save({
            address: allAddress[i].address,
            type:
              totalTransaction >= Number(STORAGE_ADDRESS_COUNT)
                ? 'storage'
                : 'default',
            totalSent: incomingAddress ? incomingAddress?.total : 0,
            totalReceived: outgoingAddress ? outgoingAddress?.total : 0,
            updatedAt: Date.now(),
          });
          addresses.push(allAddress[i].address);
        } catch (error) {
          console.error(
            `Update address ${
              allAddress[i].address
            } error >>> ${getDateErrorFormat()} >>>`,
            error.message,
          );
        }
      }
    }

    if (addresses.length) {
      await connection.getRepository(AddressEntity).save(addresses);
    }
  } catch (error) {
    console.error(
      `Update address error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}

export async function updateAddress(
  connection: Connection,
  inputAddress: string,
): Promise<void> {
  const STORAGE_ADDRESS_COUNT = process.env.STORAGE_ADDRESS_COUNT;
  const STORAGE_ADDRESS_AMOUNT = process.env.STORAGE_ADDRESS_AMOUNT;
  if (!STORAGE_ADDRESS_COUNT || !STORAGE_ADDRESS_AMOUNT) {
    return;
  }
  try {
    const allAddress = await addressEventsService.getByAddress(inputAddress);
    const totalTransaction =
      await addressEventsService.getTransactionStorageAddressByAddress(
        Number(STORAGE_ADDRESS_AMOUNT),
        inputAddress,
      );
    const incomingAddress = allAddress.find(
      a => a.address === inputAddress && a.direction === 'Incoming',
    );
    const outgoingAddress = allAddress.find(
      a => a.address === inputAddress && a.direction === 'Outgoing',
    );
    await connection.getRepository(AddressEntity).save({
      address: inputAddress,
      type:
        totalTransaction >= Number(STORAGE_ADDRESS_COUNT)
          ? 'storage'
          : 'default',
      totalSent: incomingAddress ? incomingAddress?.total : 0,
      totalReceived: outgoingAddress ? outgoingAddress?.total : 0,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error(
      `Update address ${inputAddress} error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
