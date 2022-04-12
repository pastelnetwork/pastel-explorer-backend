import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import rpcClient from '../components/rpc-client/rpc-client';
import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import transactionService from '../services/transaction.service';
import {
  batchCreateAddressEvents,
  batchCreateTransactions,
} from './seed-blockchain-data/db-utils';

async function syncBlocksData(connection: Connection) {
  try {
    const processingTimeStart = Date.now();
    const startingBlock = process.argv[3];
    if (process.argv[2] === 'update') {
      const savedUnconfirmedTransactions =
        await transactionService.getAllByBlockHash(null);

      const getBlockHashCommands = Array(1)
        .fill({
          method: 'getblockhash',
        })
        .map(v => ({
          ...v,
          parameters: [parseInt(startingBlock)],
        }));

      const blockHashes = await rpcClient.command<string[]>(
        getBlockHashCommands,
      );
      const getBlocksCommand = blockHashes.map(v => ({
        method: 'getblock',
        parameters: [v],
      }));

      const blocks = (
        await rpcClient.command<BlockData[]>(getBlocksCommand)
      ).filter(v => v.code !== -1);

      if (blocks.length) {
        await connection
          .createQueryBuilder()
          .insert()
          .into(BlockEntity)
          .values({
            confirmations: blocks[0].confirmations,
            difficulty: blocks[0].difficulty,
            id: blocks[0].hash,
            height: parseInt(blocks[0].height).toString(),
            merkleRoot: blocks[0].merkleroot,
            nextBlockHash: blocks[0].nextblockhash,
            previousBlockHash: blocks[0].previousblockhash,
            nonce: blocks[0].nonce,
            solution: blocks[0].solution,
            size: blocks[0].size,
            timestamp: blocks[0].time,
            transactionCount: blocks[0].tx.length,
          })
          .execute();
      }

      const getTransactionsCommand = blocks
        .map(v =>
          v.tx.map(t => ({
            method: 'getrawtransaction',
            parameters: [t, 1],
          })),
        )
        .flat();
      const resRawTransactions = await rpcClient.command<TransactionData[]>(
        getTransactionsCommand,
      );

      const rawTransactions = resRawTransactions.filter(t => t?.blockhash);
      const [unconfirmedTransactionsIdx] = await rpcClient.command<
        Array<
          Record<
            string,
            { time: number; size: number; fee: number; height: number; }
          >
        >
      >([
        {
          method: 'getrawmempool',
          parameters: [true],
        },
      ]);

      const getUnconfirmedTransactionsCommand = Object.keys(
        unconfirmedTransactionsIdx,
      )
        .filter(tx => !savedUnconfirmedTransactions.find(t => t.id === tx))
        .map(t => ({
          method: 'getrawtransaction',
          parameters: [t, 1],
        }))
        .flat();

      const unconfirmedTransactions = (
        await rpcClient.command<TransactionData[]>(
          getUnconfirmedTransactionsCommand,
        )
      ).map(v => ({
        ...v,
        time: unconfirmedTransactionsIdx[v.txid].time,
        size: unconfirmedTransactionsIdx[v.txid].size,
        fee: unconfirmedTransactionsIdx[v.txid].fee,
        height: unconfirmedTransactionsIdx[v.txid].height,
        blockhash: null,
      }));
      const transactions = [];
      [...rawTransactions, ...unconfirmedTransactions].forEach(i => {
        if (i && i.vin) {
          transactions.push(i);
        }
      });

      for (const transaction of rawTransactions) {
        await batchCreateTransactions(connection, [
          {
            id: transaction.txid,
            timestamp: transaction.time,
            coinbase:
              (transaction.vin.length === 1 &&
              Boolean(transaction.vin[0].coinbase)
                ? 1
                : 0) || null,
            recipientCount: transaction.vout.length,
            blockHash: transaction.blockhash,
            rawData: JSON.stringify(transaction),
            isNonStandard: transaction.vout.length === 0 ? 1 : null,
            size: transaction.size || null,
            fee: transaction.fee || null,
            height: transaction.height || null,
            totalAmount: 0,
            unconfirmedTransactionDetails: null,
          },
        ]);

        const outgoingTrxs = transaction.vout
          .map(t => ({
            address: t.scriptPubKey.addresses?.[0],
            amount: Number(t.value),
            timestamp: transaction.time,
            transactionHash: transaction.txid,
            direction: 'Incoming' as TransferDirectionEnum,
          }))
          .filter(v => Boolean(v.address));

        if (outgoingTrxs.length) {
          await batchCreateAddressEvents(connection, outgoingTrxs);
          await connection
            .createQueryBuilder()
            .update(TransactionEntity)
            .set({
              totalAmount: outgoingTrxs
                .filter(
                  v => v.transactionHash === transaction.txid && v.amount > 0,
                )
                .reduce((acc, curr) => acc + Number(curr.amount), 0),
            })
            .where('id = :id', { id: transaction.txid })
            .execute();
        }
      }

      const vinTransactionsIds = transactions
        .map(t => t.vin.map(v => v.txid))
        .flat()
        .filter(Boolean);

      const getVinTransactionsCommand = vinTransactionsIds.map(t => ({
        method: 'getrawtransaction',
        parameters: [t, 1],
      }));

      const batchAddressEventsChunks = [
        ...Array(Math.ceil(getVinTransactionsCommand.length / 1)),
      ].map(() => getVinTransactionsCommand.splice(0, 1));

      for (const b of batchAddressEventsChunks) {
        const result = (await rpcClient.command<TransactionData[]>(b)).flat();
        if (result.length) {
          for (const transaction of rawTransactions) {
            const incomingTrxs = transaction.vin
              .map(t => {
                if (t.coinbase) {
                  return null;
                }
                const relatedTransaction = result.find(
                  vt => vt.txid === t.txid,
                );
                if (relatedTransaction) {
                  const relatedTransfer = relatedTransaction.vout.find(
                    v => v.n === t.vout,
                  );
                  return {
                    address: relatedTransfer.scriptPubKey.addresses[0],
                    amount: -1 * Number(relatedTransfer.value),
                    timestamp: transaction.time,
                    transactionHash: transaction.txid,
                    direction: 'Outgoing' as TransferDirectionEnum,
                  };
                }
              })
              .filter(Boolean);
            if (incomingTrxs.length) {
              await batchCreateAddressEvents(connection, incomingTrxs);
            }
          }
        }
      }
    }

    console.log(
      `Processing sync blocks finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
  } catch (e) {
    console.log(e);
  }
  exit();
}

createConnection().then(syncBlocksData);
