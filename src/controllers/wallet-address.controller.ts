import { AddressEventEntity } from 'entity/address-event.entity';
import express from 'express';

import accountRankService from '../services/account-rank.service';
import addressEventsService from '../services/address-events.service';
import { TPeriod } from '../utils/period';

export const walletAddressController = express.Router();

walletAddressController.get('/balance-history/:id', async (req, res) => {
  try {
    const { period } = req.query;
    const id: string = req.params.id;
    if (!id) {
      return res.status(400).json({
        message: 'id (address) is required',
      });
    }

    const data = await addressEventsService.getBalanceHistory(
      id?.toString() || '',
      period as TPeriod,
    );
    return res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

walletAddressController.get('/latest-transactions/:id', async (req, res) => {
  try {
    const address: string = req.params.id;
    if (!address) {
      return res.status(400).json({
        message: 'id (address) is required',
      });
    }
    const offset: number = Number(req.query.offset) || 0;
    const limit: number = Number(req.query.limit) || 10;
    const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = req.query.sortBy as keyof AddressEventEntity;
    const sortByFields = [
      'direction',
      'transactionHash',
      'amount',
      'timestamp',
    ];
    if (sortBy && !sortByFields.includes(sortBy)) {
      return res.status(400).json({
        message: `sortBy can be one of following: ${sortByFields.join(',')}`,
      });
    }
    if (typeof limit !== 'number' || limit < 0 || limit > 100) {
      return res
        .status(400)
        .json({ message: 'limit must be between 0 and 100' });
    }

    const addressEvents = await addressEventsService.findAllByAddress({
      address,
      limit,
      offset,
      orderBy: sortBy || 'timestamp',
      orderDirection: sortDirection,
    });

    return res.send({ data: addressEvents });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

walletAddressController.get('/:id', async (req, res) => {
  const address: string = req.params.id;
  if (!address) {
    return res.status(400).json({
      message: 'id (address) is required',
    });
  }
  try {
    const incomingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Incoming' as TransferDirectionEnum,
    );
    if (!incomingSum) {
      return res.status(404).json({
        message: 'address not found',
      });
    }
    const outgoingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Outgoing' as TransferDirectionEnum,
    );

    return res.send({
      incomingSum,
      outgoingSum,
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
