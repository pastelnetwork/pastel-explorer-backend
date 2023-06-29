import express from 'express';

import ticketService from '../services/ticket.service';
import { searchCollectionItemsSchema } from '../utils/validator';

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

/**
 * @swagger
 * /v1/collections/items:
 *   get:
 *     summary: Get collection items
 *     tags: [Collections]
 *     parameters:
 *       - in: query
 *         name: collection_id
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollectionItems'
 *       400:
 *         description: collection_id is required
 *       500:
 *         description: Internal Error.
 */
collectionController.get('/items', async (req, res) => {
  const { offset, limit } = searchCollectionItemsSchema.validateSync(req.query);

  const id: string = req.query.collection_id as string;
  if (!id) {
    return res.status(400).json({
      message: 'collection_id is required',
    });
  }

  try {
    const collections = await ticketService.getCollectionItems(
      id,
      offset,
      limit,
    );
    const totalItems = await ticketService.countTotalCollectionItems(id);
    return res.send({
      items: collections,
      totalItems: collections?.length ? totalItems : 0,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/collections/related:
 *   get:
 *     summary: Get related items
 *     tags: [Collections]
 *     parameters:
 *       - in: query
 *         name: collection_id
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: txId
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: limit
 *         default: 10
 *         schema:
 *           type: number
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollectionRelated'
 *       400:
 *         description: collection_id is required
 *       500:
 *         description: Internal Error.
 */
collectionController.get('/related', async (req, res) => {
  const { limit } = searchCollectionItemsSchema.validateSync(req.query);

  const id: string = req.query.collection_id as string;
  if (!id) {
    return res.status(400).json({
      message: 'collection_id is required',
    });
  }

  const txId: string = req.query.txId as string;
  if (!txId) {
    return res.status(400).json({
      message: 'txId is required',
    });
  }

  try {
    const collections = await ticketService.getRelatedItems(id, txId, limit);
    return res.send({ items: collections });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});
