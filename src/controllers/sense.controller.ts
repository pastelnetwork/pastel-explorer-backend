import express from 'express';
import { getConnection } from 'typeorm';

import { updateSenseRequests } from '../scripts/seed-blockchain-data/updated-sense-requests';
import senseRequestsService from '../services/senserequests.service';
import transactionService from '../services/transaction.service';

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
    let data = await senseRequestsService.getSenseRequestByImageHash(id, txid);
    if (!data && txid) {
      const transaction = await transactionService.findOneById(txid);
      const imageHash = await updateSenseRequests(
        getConnection(),
        txid,
        {
          imageTitle: '',
          imageDescription: '',
          isPublic: true,
          ipfsLink: '',
          sha256HashOfSenseResults: '',
        },
        Number(transaction.block.height),
        transaction.timestamp * 1000,
      );

      data = await senseRequestsService.getSenseRequestByImageHash(
        imageHash,
        txid,
      );
    }

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
            openApiSubsetIdString: data.openApiSubsetIdString,
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
          }
        : null,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});
