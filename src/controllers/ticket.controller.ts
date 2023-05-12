import express from 'express';

import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import { getStartDateByPeriod, TPeriod } from '../utils/period';

export const ticketController = express.Router();

/**
 * @swagger
 * /v1/tickets/nft-details:
 *   get:
 *     summary: Get tickets by type
 *     tags: [Tickets]
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
ticketController.get('/nft-details', async (req, res) => {
  const txid: string = req.query.registration_ticket_txid as string;
  if (!txid) {
    return res.status(400).json({
      message: 'registration_ticket_txid is required',
    });
  }
  try {
    const nftActivationTicket =
      await ticketService.getNFTActivationTicketByTxId(txid);
    if (!nftActivationTicket?.id) {
      return res.send({ data: null });
    }

    const nft = await ticketService.getNftDetailsByTxId(txid);
    return res.send({ nft });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/tickets/nft-details/item-activity:
 *   get:
 *     summary: Get tickets by type
 *     tags: [Tickets]
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
 *       - in: query
 *         name: limit
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
 *         description: registration_ticket_txid, offset or limit is required
 *       500:
 *         description: Internal Error.
 */
ticketController.get('/nft-details/item-activity', async (req, res) => {
  const txid: string = req.query.registration_ticket_txid as string;
  const offset: string = req.query.offset as string;
  const limit: string = req.query.offset as string;
  if (!txid) {
    return res.status(400).json({
      message: 'registration_ticket_txid is required',
    });
  }
  if (!offset) {
    return res.status(400).json({
      message: 'offset is required',
    });
  }
  if (isNaN(parseInt(offset))) {
    return res.status(400).json({
      message: 'offset must be an integer',
    });
  }
  if (!limit) {
    return res.status(400).json({
      message: 'limit is required',
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
      Number(offset),
      Number(limit),
    );
    const total = await ticketService.countTotalItemActivityForNFTDetails(txid);

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
 * /v1/tickets/{ticket_type}:
 *   get:
 *     summary: Get tickets by type
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: ticket_type
 *         default: "sense"
 *         schema:
 *           type: string
 *           enum: ["pastelid", "cascade", "sense", "username-change", "nft-reg", "nft-act", "collection-reg", "collection-act", "nft-royalty", "action-act", "offer", "accept", "transfer"]
 *         required: true
 *       - in: query
 *         name: limit
 *         default: 10
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: offset
 *         default: 0
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: period
 *         default: "all"
 *         schema:
 *           type: string
 *           enum: ["1d", "7d", "30d", "60d", "all"]
 *         required: false
 *       - in: query
 *         name: status
 *         default: "all"
 *         schema:
 *           type: string
 *           enum: ["all", "activated", "inactivated"]
 *         required: false
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: number
 *         required: false
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: number
 *         required: false
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tickets'
 *       400:
 *         description: type is required
 *       500:
 *         description: Internal Error.
 */
ticketController.get('/:ticket_type', async (req, res) => {
  const type: string = req.params.ticket_type;
  if (!type) {
    return res.status(400).json({
      message: 'type is required',
    });
  }
  try {
    const { offset, limit, include, period, status, startDate, endDate } =
      req.query;

    let newStartDate: number = Number(startDate) || 0;
    if (period) {
      newStartDate = getStartDateByPeriod(period as TPeriod);
    }
    const newEndDate = Number(endDate) || Date.now();
    let total = await ticketService.countTotalTicketsByType(
      type,
      newStartDate,
      newEndDate,
    );
    if (include === 'all') {
      const tickets = await ticketService.getTicketsType(
        type,
        Number(offset || 0),
        Number(limit || 10),
        status as string,
        newStartDate,
        newEndDate,
      );
      let txIds = tickets?.map(ticket => ticket.transactionHash);
      let newTickets = tickets || [];
      if (['sense', 'cascade'].includes(type)) {
        if (status) {
          switch (status as string) {
            case 'activated':
              newTickets = tickets.filter(
                ticket => ticket.data.ticket?.activation_ticket,
              );
              txIds = newTickets?.map(ticket => ticket.transactionHash) || [];
              break;
            case 'inactivated':
              newTickets = tickets.filter(
                ticket => !ticket.data?.ticket?.activation_ticket,
              );
              txIds = newTickets?.map(ticket => ticket.transactionHash) || [];
              break;
            default:
              break;
          }
          total = await ticketService.countTotalTicketsByStatus(
            type,
            status as string,
            newStartDate,
            newEndDate,
          );
        }
      }
      let senses = [];
      if (txIds?.length) {
        senses = await senseRequestsService.getImageHashByTxIds(txIds);
      }
      return res.send({
        data: newTickets,
        total,
        senses,
      });
    }

    let tickets = await ticketService.getTicketsByType(
      type,
      Number(offset || 0),
      Number(limit || 10),
    );
    const txIds = tickets?.map(ticket => ticket.transactionHash);
    let senses = [];
    if (txIds?.length) {
      senses = await senseRequestsService.getImageHashByTxIds(txIds);
    }
    tickets = tickets.map(ticket => {
      const sense = senses.find(
        s => s.transactionHash === ticket.transactionHash,
      );
      return {
        ...ticket,
        imageHash: sense?.imageFileHash || '',
        dupeDetectionSystemVersion: sense?.dupeDetectionSystemVersion || '',
      };
    });
    return res.send({ tickets, total });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});
