import express from 'express';

import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import { getStartDateByPeriod, TPeriod } from '../utils/period';

export const ticketController = express.Router();

/**
 * @swagger
 * /v1/tickets/{type}:
 *   get:
 *     summary: Get tickets by type
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: type
 *         default: "sense"
 *         schema:
 *           type: string
 *           enum: ["pastelid", "cascade", "sense", "username-change", "nft-reg", "nft-act", "nft-collection-reg", "nft-collection-act", "nft-royalty", "action-act", "offer", "accept", "transfer"]
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
ticketController.get('/:type', async (req, res) => {
  const type: string = req.params.type;
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
    const newEndDate = Number(endDate) || null;
    let total = await ticketService.countTotalTicketsByType(
      type,
      newStartDate,
      newEndDate,
    );
    if (include === 'all') {
      const tickets = await ticketService.getTicketsType(
        type,
        Number(offset),
        Number(limit),
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
      Number(offset),
      Number(limit),
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
