import { Connection } from 'typeorm';

import ticketService from '../../services/ticket.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { updateCascade } from './update-cascade';
import { saveNftInfo } from './updated-nft';
import { updateSenseRequests } from './updated-sense-requests';

let isSaveSenseRequests = false;
export async function saveSenseRequests(connection: Connection): Promise<void> {
  if (isSaveSenseRequests) {
    return;
  }
  isSaveSenseRequests = true;
  try {
    const imageData = {
      imageTitle: '',
      imageDescription: '',
      isPublic: true,
      ipfsLink: '',
      sha256HashOfSenseResults: '',
    };
    const senseTicket =
      await ticketService.getLatestSenseOrCascadeTicket('sense');
    if (senseTicket) {
      await updateSenseRequests(
        connection,
        senseTicket.transactionHash,
        imageData,
        senseTicket.height,
        senseTicket.transactionTime,
      );
      await ticketService.updateCheckStatusForTicket(
        senseTicket.transactionHash,
      );
    }
  } catch (error) {
    console.error(
      `Save Sense Requests error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
  isSaveSenseRequests = false;
}

let isSaveCascade = false;
export async function saveCascade(connection: Connection): Promise<void> {
  if (isSaveCascade) {
    return;
  }
  isSaveCascade = true;
  try {
    const cascadeTicket =
      await ticketService.getLatestSenseOrCascadeTicket('cascade');
    if (cascadeTicket) {
      let status = 'inactive';
      const actionActTicket = await ticketService.getActionIdTicket(
        cascadeTicket.transactionHash,
        'action-act',
      );
      if (actionActTicket?.transactionHash) {
        status = 'active';
      }
      await updateCascade(
        connection,
        cascadeTicket.transactionHash,
        cascadeTicket.height,
        cascadeTicket.transactionTime,
        status,
      );
      await ticketService.updateCheckStatusForTicket(
        cascadeTicket.transactionHash,
      );
    }
  } catch (error) {
    console.error(
      `Save Cascade error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
  isSaveCascade = false;
}

let isSaveNft = false;
export async function saveNft(connection: Connection): Promise<void> {
  if (isSaveNft) {
    return;
  }
  isSaveNft = true;
  try {
    const nftTicket = await ticketService.getLatestNftTicket();
    if (nftTicket) {
      let status = 'inactive';
      const actionActTicket = await ticketService.getActionIdTicket(
        nftTicket.transactionHash,
        'nft-act',
      );
      if (actionActTicket?.transactionHash) {
        status = 'active';
      }
      await saveNftInfo(
        connection,
        nftTicket.transactionHash,
        nftTicket.transactionTime,
        nftTicket.height,
        status,
      );
      await ticketService.updateCheckStatusForTicket(nftTicket.transactionHash);
    }
  } catch (error) {
    console.error(
      `Save Cascade error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
  isSaveNft = false;
}
