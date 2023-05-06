import express from 'express';

import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';

export const pastelIdController = express.Router();

/**
 * @swagger
 * /v1/pastelid/{pastelId}:
 *   get:
 *     summary: Get PastelID detail
 *     tags: [PastelID]
 *     parameters:
 *       - in: path
 *         name: pastelId
 *         default: "jXaTbnxkpfEJhYS1otNiHEbYSKCJSwAhe8XcNZ9SSbFGDPrqR2vRYd9upMHVHL3vTjyvYfNtwbmfiwDetxPcpY"
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: limit
 *         default: 5
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
 *         name: ticket_type
 *         default: "all"
 *         schema:
 *           type: string
 *           enum: ["all", "pastelid", "username-change", "nft-reg", "nft-act", "collection-reg", "collection-act", "nft-royalty", "action-reg", "action-act", "offer", "accept", "transfer"]
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PastelIdDetail'
 *       400:
 *         description: PastelID is required
 *       500:
 *         description: Internal Error.
 */
pastelIdController.get('/:pastelId', async (req, res) => {
  const id: string = req.params.pastelId;
  if (!id) {
    return res.status(400).json({
      message: 'PastelID is required',
    });
  }
  const { offset, limit, ticket_type: type, username } = req.query;

  try {
    const data = await ticketService.getTicketsByPastelId(
      id,
      type?.toString(),
      Number(offset || 0),
      Number(limit || 10),
    );
    const total = await ticketService.countTotalTicketByPastelId(
      id,
      type?.toString(),
    );
    const totalAllTickets = await ticketService.countTotalTicketByPastelId(
      id,
      'all',
    );
    let position = 0;
    if (username && type === 'username-change') {
      const ticket = await ticketService.getPositionUsernameInDbByPastelId(
        id,
        username.toString(),
      );
      position = ticket.position;
    }
    const ticketsType = await ticketService.getTotalTypeByPastelId(id);
    const senses = await senseRequestsService.getAllByPastelId(id);
    const latestUsername = await ticketService.getLatestUsernameForPastelId(id);
    const registeredPastelId = await ticketService.getRegisteredPastelId(id);
    return res.send({
      data,
      total,
      ticketsType,
      totalAllTickets,
      senses,
      username: latestUsername?.rawData
        ? JSON.parse(latestUsername?.rawData)?.ticket?.username
        : undefined,
      position: username && type === 'username-change' ? position : undefined,
      blockHeight: registeredPastelId.height,
      registeredDate: registeredPastelId?.rawData
        ? JSON.parse(registeredPastelId?.rawData).ticket.timestamp
        : 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});
