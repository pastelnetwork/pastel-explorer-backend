import express from 'express';

import ticketService from '../services/ticket.service';

export const collectionController = express.Router();

/**
 * @swagger
 * /v1/collections:
 *   get:
 *     summary: Get collection detail
 *     tags: [Collections]
 *     parameters:
 *       - in: query
 *         name: collection_id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollectionDetail'
 *       400:
 *         description: collection_id is required
 *       500:
 *         description: Internal Error.
 */
collectionController.get('/', async (req, res) => {
  const id: string = req.query.collection_id as string;
  if (!id) {
    return res.status(400).json({
      message: 'collection_id is required',
    });
  }

  try {
    const collection = await ticketService.getCollectionByAlias(id);
    return res.send({ collection });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});
