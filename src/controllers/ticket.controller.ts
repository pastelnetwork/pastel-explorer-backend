import express from 'express';

import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import { getStartDateByPeriod, TPeriod } from '../utils/period';

export const ticketController = express.Router();

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
 *           enum: ["pastelid", "cascade", "sense", "username-change", "nft-reg", "nft-act", "collection-reg", "collection-act", "nft-royalty", "action-act", "offer", "accept", "transfer", "pastelid-usename", "pastel-nft", "offer-transfer", "other"]
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
    const {
      offset,
      limit,
      include,
      period,
      status,
      startDate,
      endDate,
      sort,
      nftStatus,
    } = req.query;

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
        sort?.toString() || '',
        nftStatus as string,
      );
      const txIds = tickets?.map(ticket => ticket.transactionHash);
      total = await ticketService.countTotalTicketsByStatus(
        type,
        status as string,
        newStartDate,
        newEndDate,
        nftStatus as string,
      );
      let senses = [];
      if (txIds?.length) {
        senses = await senseRequestsService.getImageHashByTxIds(txIds);
      }
      return res.send({
        data: tickets,
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
        imageFileCdnUrl: sense?.imageFileCdnUrl || '',
        dupeDetectionSystemVersion: sense?.dupeDetectionSystemVersion || '',
      };
    });
    return res.send({ tickets, total });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});
