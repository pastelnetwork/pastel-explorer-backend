import cascadeService from '../../services/cascade.service';
import nftService from '../../services/nft.service';
import senseRequestsService from '../../services/senserequests.service';
import ticketService from '../../services/ticket.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { updateCascadeData } from './update-cascade';
import { saveNftData } from './updated-nft';
import { updateSenseRequestsData } from './updated-sense-requests';

let isSaveSenseRequests = false;
export async function updateSenseByTransaction(transaction: ITransactionData) {
  const imageData = {
    imageTitle: '',
    imageDescription: '',
    isPublic: true,
    ipfsLink: '',
    sha256HashOfSenseResults: '',
  };
  await updateSenseRequestsData(
    transaction.transactionHash,
    imageData,
    transaction.height,
    transaction.transactionTime,
  );
}
export async function saveSenseRequests(): Promise<void> {
  if (isSaveSenseRequests) {
    return;
  }
  isSaveSenseRequests = true;
  try {
    const senseTicket =
      await ticketService.getLatestSenseOrCascadeTicket('sense');
    if (senseTicket) {
      await updateSenseByTransaction(senseTicket);
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
export async function updateCascadeByTransaction(
  transaction: ITransactionData,
) {
  let status = 'inactive';
  const actionActTicket = await ticketService.getActionIdTicket(
    transaction.transactionHash,
    'action-act',
  );
  if (actionActTicket?.transactionHash) {
    status = 'active';
  }
  await updateCascadeData(
    transaction.transactionHash,
    transaction.height,
    transaction.transactionTime,
    status,
  );
}
export async function saveCascade(): Promise<void> {
  if (isSaveCascade) {
    return;
  }
  isSaveCascade = true;
  try {
    const cascadeTicket =
      await ticketService.getLatestSenseOrCascadeTicket('cascade');
    if (cascadeTicket) {
      await updateCascadeByTransaction(cascadeTicket);
      await ticketService.updateCheckStatusForTicket(
        cascadeTicket.transactionHash,
      );
    }
    const contractTicket =
      await ticketService.getLatestSenseOrCascadeTicket('contract');
    if (contractTicket) {
      await updateCascadeByTransaction(contractTicket);
      await ticketService.updateCheckStatusForTicket(
        contractTicket.transactionHash,
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
export async function updateNftByTransaction(transaction: ITransactionData) {
  let status = 'inactive';
  const actionActTicket = await ticketService.getActionIdTicket(
    transaction.transactionHash,
    'nft-act',
  );
  if (actionActTicket?.transactionHash) {
    status = 'active';
  }
  await saveNftData(
    transaction.transactionHash,
    transaction.transactionTime,
    transaction.height,
    status,
  );
}
export async function saveNft(): Promise<void> {
  if (isSaveNft) {
    return;
  }
  isSaveNft = true;
  try {
    const nftTicket = await ticketService.getLatestNftTicket();
    if (nftTicket) {
      await updateNftByTransaction(nftTicket);
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

export async function updateSenseOrCascadeOrNftByTickets(
  tickets,
  blockHeight,
): Promise<boolean> {
  let hasUpdate = false;
  const senseTickets = tickets.filter(
    t => t.type === 'action-reg' && t.data.ticket.action_type === 'sense',
  );
  if (senseTickets.length) {
    try {
      const txIds = senseTickets.map(t => t.transactionHash);
      const senseRequest = await senseRequestsService.getAllByTxIds(txIds);
      const txIdBySense = senseRequest.map(s => s.transactionHash);
      const newSenseTickets = senseTickets.filter(
        ticket => !txIdBySense.includes(ticket.transactionHash),
      );
      if (newSenseTickets.length) {
        for (const ticket of newSenseTickets) {
          await updateSenseByTransaction({
            transactionHash: ticket.transactionHash,
            height: Number(blockHeight),
            transactionTime: ticket.data.ticket.transactionTime,
          });
        }
        hasUpdate = true;
      }
    } catch (error) {
      console.error(
        'Update sense request in transaction detail error:',
        error.message,
      );
    }
  }
  const cascadeTickets = tickets.filter(
    t => t.type === 'action-reg' && t.data.ticket.action_type === 'cascade',
  );
  if (cascadeTickets.length) {
    try {
      const txIds = cascadeTickets.map(t => t.transactionHash);
      const cascade = await cascadeService.getByTxIds(txIds);
      const txIdByCascade = cascade.map(s => s.transactionHash);
      const newCascadeTickets = cascadeTickets.filter(
        ticket => !txIdByCascade.includes(ticket.transactionHash),
      );

      if (newCascadeTickets.length) {
        for (const ticket of newCascadeTickets) {
          await updateCascadeByTransaction({
            transactionHash: ticket.transactionHash,
            height: Number(blockHeight),
            transactionTime: ticket.data.ticket.transactionTime,
          });
        }
        hasUpdate = true;
      }
    } catch (error) {
      console.error(
        'Update cascade in transaction detail error:',
        error.message,
      );
    }
  }
  const nftTickets = tickets.filter(t => t.type === 'nft-reg');
  if (nftTickets.length) {
    try {
      const txIds = nftTickets.map(t => t.transactionHash);
      const nfts = await nftService.getByTxIds(txIds);
      const txIdByNft = nfts.map(s => s.transactionHash);
      const newNftTickets = nftTickets.filter(
        ticket => !txIdByNft.includes(ticket.transactionHash),
      );

      if (newNftTickets.length) {
        for (const ticket of newNftTickets) {
          await updateNftByTransaction({
            transactionHash: ticket.transactionHash,
            height: Number(blockHeight),
            transactionTime: ticket.data.ticket.transactionTime,
          });
        }
        hasUpdate = true;
      }
    } catch (error) {
      console.error('Update nft in transaction detail error:', error.message);
    }
  }
  return hasUpdate;
}
