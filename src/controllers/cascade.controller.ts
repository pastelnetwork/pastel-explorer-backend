import express from 'express';

import { updateCascadeByTransaction } from '../scripts/seed-blockchain-data/update-sense-cascade-nft';
import ticketService from '../services/ticket.service';

export const cascadeController = express.Router();

/**
 * @swagger
 * /v1/cascade:
 *   get:
 *     summary: Get cascade detail
 *     tags: [Cascade]
 *     parameters:
 *       - in: query
 *         name: registration_ticket_txid
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CascadeDetails'
 *       400:
 *         description: registration_ticket_txid is required
 *       500:
 *         description: Internal Error.
 */
cascadeController.get('/', async (req, res) => {
  const txid: string = req.query.registration_ticket_txid as string;
  if (!txid) {
    return res.status(400).json({
      message: 'registration_ticket_txid is required',
    });
  }

  try {
    const actionActivationTicket =
      await ticketService.getActionActivationTicketByTxId(txid);
    if (!actionActivationTicket?.transactionHash) {
      return res.send({ data: null });
    }

    let cascade = await ticketService.getCascadeInfo(txid);
    if (!cascade) {
      const cascadeTicket = await ticketService.getDataByTransaction(txid);
      if (cascadeTicket) {
        await updateCascadeByTransaction(cascadeTicket);
        cascade = await ticketService.getCascadeInfo(txid);
      }
    }
    let currentOwner = null;
    if (cascade.ticketId) {
      currentOwner = await ticketService.getLatestTransferTicketsByTxId(
        cascade.ticketId,
      );
    }
    return res.send({
      data: cascade?.rawData || null,
      creatorPastelID: cascade?.pastelID,
      currentOwnerPastelID: currentOwner?.pastelID || null,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/cascade/transfers:
 *   get:
 *     summary: Get transfers
 *     tags: [NFTs]
 *     parameters:
 *       - in: query
 *         name: registration_ticket_txid
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: offset
 *         schema:
 *           type: string
 *         required: true
 *         default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *         required: true
 *         default: 5
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offers'
 *       400:
 *         description: registration_ticket_txid, offset or limit is required
 *       500:
 *         description: Internal Error.
 */
cascadeController.get('/transfers', async (req, res) => {
  const txid: string = req.query.registration_ticket_txid as string;
  const offset: string = req.query.offset as string;
  const limit: string = req.query.offset as string;
  if (!txid) {
    return res.status(400).json({
      message: 'registration_ticket_txid is required',
    });
  }
  if (isNaN(parseInt(offset))) {
    return res.status(400).json({
      message: 'offset must be an integer',
    });
  }
  if (isNaN(parseInt(limit))) {
    return res.status(400).json({
      message: 'limit must be an integer',
    });
  }
  try {
    const transfers = await ticketService.getAllTransferTicketsByTxId(
      txid,
      Number(offset) || 0,
      Number(limit) || 5,
    );
    const item = await ticketService.countTotalTransfers(txid);

    return res.send({
      items: transfers?.map(transfer => {
        const ticket = JSON.parse(transfer.rawData).ticket;
        return {
          transactionHash: transfer.transactionHash,
          pastelID: transfer.pastelID,
          transactionTime: transfer.transactionTime,
          offer_txid: ticket.offer_txid,
          accept_txid: ticket.accept_txid,
          item_txid: ticket.item_txid,
          registration_txid: ticket.registration_txid,
          copy_serial_nr: ticket.copy_serial_nr,
        };
      }),
      totalItems: item?.total || 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});
