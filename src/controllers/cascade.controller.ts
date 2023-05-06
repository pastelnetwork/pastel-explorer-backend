import express from 'express';

import ticketService from '../services/ticket.service';

export const cascadeController = express.Router();

/**
 * @swagger
 * /v1/cascade:
 *   get:
 *     summary: Get cascade detail
 *     tags: [Cascade]
 *     parameters:
 *       - in: query
 *         name: registration_ticket_txid
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CascadeDetails'
 *       400:
 *         description: registration_ticket_txid is required
 *       500:
 *         description: Internal Error.
 */
cascadeController.get('/', async (req, res) => {
  const txid: string = req.query.registration_ticket_txid as string;
  if (!txid) {
    return res.status(400).json({
      message: 'registration_ticket_txid is required',
    });
  }

  try {
    const cascade = await ticketService.getCascadeInfo(txid);
    return res.send({ data: cascade?.rawData || null });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});
