import express from 'express';

import nftService from '../services/nft.service';
import ticketService from '../services/ticket.service';

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
    const nft = await nftService.getNftDetailsByTxId(txid);
    if (!nft?.transactionHash) {
      return res.send({ nft: null });
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
    const item = await ticketService.countTotalIOffers(txid);

    return res.send({
      items: offers?.map(item => {
        const ticket = JSON.parse(item.rawData).ticket;
        return {
          transactionHash: item.transactionHash,
          offer_txid: ticket.offer_txid,
          pastelID: item?.pastelID || '',
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
