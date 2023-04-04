import express from 'express';

import masternodeService from '../services/masternode.service';
import peerService from '../services/peer.service';

export const peerController = express.Router();

/**
 * @swagger
 * /v1/network:
 *   get:
 *     summary: Get peer nodes info (with IP, country, city etc.)
 *     tags: [Network]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Network'
 *       500:
 *         description: Internal Error.
 */
peerController.get('/', async (req, res) => {
  try {
    if (!req.query.limit) {
      const peers = await peerService.getAll();
      const masternodes = await masternodeService.getAll();

      return res.send({
        peers,
        masternodes,
      });
    }

    const masternodes = await masternodeService.getAllForMasternodePage();
    return res.send({
      masternodes,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
