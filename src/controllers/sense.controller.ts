import express from 'express';

import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';

export const senseController = express.Router();

/**
 * @swagger
 * /v1/sense:
 *   get:
 *     summary: Get sense detail
 *     tags: [Sense]
 *     parameters:
 *       - in: query
 *         name: media_file_hash
 *         default: "a574a2ea8a7eaabd8a6bfe0b68ed7200c578a624eaf325d9bb6dd060554de5bc"
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: registration_ticket_txid
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SenseDetails'
 *       400:
 *         description: media_file_hash or registration_ticket_txid is required
 *       500:
 *         description: Internal Error.
 */
senseController.get('/', async (req, res) => {
  const id: string = req.query.media_file_hash as string;
  const txid: string = req.query.registration_ticket_txid as string;
  if (!id && !txid) {
    return res.status(400).json({
      message: 'media_file_hash or registration_ticket_txid is required',
    });
  }

  try {
    let currentTxId = txid;
    if (!txid) {
      const sense = await senseRequestsService.getTransactionHashByImageHash(
        id,
      );
      currentTxId = sense?.transactionHash;
    }
    const actionActivationTicket =
      await ticketService.getActionActivationTicketByTxId(currentTxId);
    if (!actionActivationTicket?.transactionHash) {
      return res.send({ data: null });
    }

    const data = await senseRequestsService.getSenseRequestByImageHash(
      id,
      txid,
    );
    const currentOwner = await ticketService.getLatestTransferTicketsByTxId(
      data.transactionHash,
    );
    return res.send({
      data: data
        ? {
            imageFileHash: data.imageFileHash,
            rawData: data.rawData,
            transactionHash: data.transactionHash,
            rarenessScoresTable: data.rarenessScoresTable,
            pastelIdOfSubmitter: data.pastelIdOfSubmitter,
            blockHash: data.blockHash,
            blockHeight: data.blockHeight,
            utcTimestampWhenRequestSubmitted:
              data.utcTimestampWhenRequestSubmitted,
            pastelIdOfRegisteringSupernode1:
              data.pastelIdOfRegisteringSupernode1,
            pastelIdOfRegisteringSupernode2:
              data.pastelIdOfRegisteringSupernode2,
            pastelIdOfRegisteringSupernode3:
              data.pastelIdOfRegisteringSupernode3,
            isPastelOpenapiRequest: data.isPastelOpenapiRequest,
            isLikelyDupe: data.isLikelyDupe,
            dupeDetectionSystemVersion: data.dupeDetectionSystemVersion,
            openNsfwScore: data.openNsfwScore,
            rarenessScore: data.rarenessScore,
            alternativeNsfwScores: data.alternativeNsfwScores,
            internetRareness: data.internetRareness,
            imageFingerprintOfCandidateImageFile:
              data.imageFingerprintOfCandidateImageFile,
            imageFileCdnUrl: data.imageFileCdnUrl,
            prevalenceOfSimilarImagesData: {
              '25%': data?.pctOfTop10MostSimilarWithDupeProbAbove25pct || 0,
              '33%': data?.pctOfTop10MostSimilarWithDupeProbAbove33pct || 0,
              '50%': data?.pctOfTop10MostSimilarWithDupeProbAbove50pct || 0,
            },
            currentOwnerPastelID: currentOwner?.pastelID || null,
          }
        : null,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/sense/transfers:
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
senseController.get('/transfers', async (req, res) => {
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
