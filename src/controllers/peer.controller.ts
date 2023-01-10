import express from 'express';

import masternodeService from '../services/masternode.service';
import peerService from '../services/peer.service';

export const peerController = express.Router();

peerController.get('/', async (req, res) => {
  try {
    const peers = (await peerService.getAll()).map(v => ({
      ...v,
    }));

    const masternodes = (await masternodeService.getAll()).map(v => ({
      ...v,
    }));

    return res.send({
      peers,
      masternodes,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
