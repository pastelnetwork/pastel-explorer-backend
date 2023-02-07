import express from 'express';

import masternodeService from '../services/masternode.service';
import peerService from '../services/peer.service';

export const peerController = express.Router();

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
