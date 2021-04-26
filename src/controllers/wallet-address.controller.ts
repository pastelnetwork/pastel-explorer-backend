import express from 'express';

import accountRankService from '../services/account-rank.service';
import addressEventsService from '../services/address-events.service';

export const walletAddressController = express.Router();

walletAddressController.get('/:id', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;

  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }
  const address: string = req.params.id;
  if (!address) {
    return res.status(400).json({
      message: 'id (address) is required',
    });
  }
  try {
    const addressEvents = await addressEventsService.findAllByAddress({
      address,
      limit,
      offset,
    });

    if (!addressEvents || addressEvents.length === 0) {
      return res.status(404).json({
        message: 'address not found',
      });
    }

    const incomingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Incoming' as TransferDirectionEnum,
    );
    const outgoingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Outgoing' as TransferDirectionEnum,
    );

    return res.send({
      data: addressEvents,
      incomingSum,
      outgoingSum,
      address: address,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

walletAddressController.get('/rank/received/100', async (req, res) => {
  try {
    const rank = await accountRankService.getTopReceivedRank();
    return res.send({
      data: rank,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
walletAddressController.get('/rank/100', async (req, res) => {
  try {
    const rank = await accountRankService.getTopBalanceRank();
    return res.send({
      data: rank,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
