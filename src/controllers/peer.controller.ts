import express from 'express';

import peerService from '../services/peer.service';

export const peerController = express.Router();

peerController.get('/', async (req, res) => {
  try {
    const peers = await peerService.getAll();

    return res.send({
      data: peers,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
