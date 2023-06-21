import express from 'express';
import { getConnection } from 'typeorm';

import {
  saveNftInfo,
  updateStatusForNft,
} from '../scripts/seed-blockchain-data/updated-nft';
import nftService from '../services/nft.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';

export const nftsController = express.Router();

/**
 * @swagger
 * /v1/nfts/details:
 *   get:
 *     summary: Get NFT details
 *     tags: [NFTs]
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
 *               $ref: '#/components/schemas/NftDetails'
 *       400:
 *         description: registration_ticket_txid is required
 *       500:
 *         description: Internal Error.
 */
nftsController.get('/details', async (req, res) => {
  const txid: string = req.query.registration_ticket_txid as string;
  if (!txid) {
    return res.status(400).json({
      message: 'registration_ticket_txid is required',
    });
  }
  try {
    let nft = await nftService.getNftDetailsByTxId(txid);
    if (!nft?.transactionHash) {
      const transaction = await transactionService.findOneById(txid);
      if (transaction?.id) {
        await saveNftInfo(
          getConnection(),
          txid,
          transaction.timestamp * 1000,
          Number(transaction.block.height),
        );
        await updateStatusForNft(txid);
        nft = await nftService.getNftDetailsByTxId(txid);
      } else {
        return res.send({ nft: null });
      }
    }
    if (nft?.status === 'inactive') {
      await updateStatusForNft(txid);
      nft = await nftService.getNftDetailsByTxId(txid);
      if (nft?.status === 'inactive') {
        return res.send({ nft: null });
      }
    }

    return res.send({ nft });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/nfts/item-activity:
 *   get:
 *     summary: Get Item Activity list
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
 *               $ref: '#/components/schemas/ItemActivity'
 *       400:
 *         description: registration_ticket_txid, offset or limit is required
 *       500:
 *         description: Internal Error.
 */
nftsController.get('/item-activity', async (req, res) => {
  const txid: string = req.query.registration_ticket_txid as string;
  const offset: string = req.query.offset as string;
  const limit: string = req.query.offset as string;
  const type: string = req.query.type as string;
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
    const nftActivationTicket =
      await ticketService.getNFTActivationTicketByTxId(txid);
    if (!nftActivationTicket?.id) {
      return res.send({ data: null });
    }

    const itemActivity = await ticketService.getItemActivityForNFTDetails(
      txid,
      Number(offset) || 0,
      Number(limit) || 5,
      type,
    );
    const total = await ticketService.countTotalItemActivityForNFTDetails(
      txid,
      type,
    );

    return res.send({
      items: itemActivity?.map(item => ({
        transactionHash: item.transactionHash,
        transactionTime: item.transactionTime,
        ticket: JSON.parse(item.rawData).ticket,
      })),
      totalItems: total?.total || 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/nfts/offers:
 *   get:
 *     summary: Get offers
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
nftsController.get('/offers', async (req, res) => {
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
    const offers = await ticketService.getOffers(
      txid,
      Number(offset) || 0,
      Number(limit) || 5,
    );
    const ticketIds = offers.map(o => o.ticketId);
    let transferTickets = [];
    let actionTickets = [];
    if (ticketIds.length) {
      actionTickets = await ticketService.getActionActivationTicketByTxIds(
        ticketIds,
      );
      transferTickets = await ticketService.getTransferTicketsByTxIds(
        ticketIds,
      );
    }
    const item = await ticketService.countTotalIOffers(txid);

    return res.send({
      items: offers?.map(item => {
        const ticket = JSON.parse(item.rawData).ticket;
        const transfer = transferTickets.find(
          t => t.offerTxId === item.transactionHash,
        );
        const actionTicket = actionTickets.find(
          a => a.transactionHash === item.transactionHash,
        );
        return {
          transactionHash: item.transactionHash,
          offer_txid: ticket.offer_txid,
          pastelID: transfer?.pastelID || actionTicket?.pastelID || '',
          price: ticket.asked_price,
          copy_number: ticket.copy_number,
          timestamp: item.transactionTime,
        };
      }),
      totalItems: item?.total || 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});
