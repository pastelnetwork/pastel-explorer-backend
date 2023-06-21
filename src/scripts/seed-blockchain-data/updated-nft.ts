import axios from 'axios';
import { decode } from 'js-base64';
import slugify from 'slugify';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { NftEntity } from '../../entity/nft.entity';
import nftService from '../../services/nft.service';
import ticketService from '../../services/ticket.service';
import * as ascii85 from '../../utils/ascii85';
import { getDateErrorFormat } from '../../utils/helpers';

const getCollectionName = async (id: string) => {
  if (!id) {
    return '';
  }
  try {
    const collection = await rpcClient.command([
      {
        method: 'tickets',
        parameters: ['get', id],
      },
    ]);
    const collectionTicket = JSON.parse(
      decode(JSON.stringify(collection[0]?.ticket?.collection_ticket)),
    );
    const collectionName = collectionTicket?.collection_name || '';
    return collectionName;
  } catch (error) {
    console.error(
      `RPC tickets find collection ${id} error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return '';
  }
};

const getNftData = async (txId: string, pid: string) => {
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL) {
    return;
  }

  try {
    const { data } = await axios.get(
      `${openNodeApiURL}/nfts?pid=${pid}&txid=${txId}`,
    );
    return data;
  } catch (error) {
    console.error(
      `Get NFT error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return '';
  }
};

export async function saveNftInfo(
  connection: Connection,
  transactionId: string,
  transactionTime: number,
  blockHeight: number,
): Promise<boolean> {
  try {
    const tickets = await rpcClient.command<
      ITicketsResponse[] | ICollectionTicketsResponse[]
    >([
      {
        method: 'tickets',
        parameters: ['get', transactionId],
      },
    ]);
    const ticket = tickets[0] as ITicketsResponse;
    if (ticket) {
      await nftService.removeNftByBlockHeight(blockHeight);
      let nftTicket = null;
      let appTicket = null;
      try {
        const decodeApiTicket = ticketData => {
          let data = null;
          try {
            data = JSON.parse(decode(ticketData));
          } catch {
            try {
              data = ascii85.decode(ticketData);
            } catch (error) {
              console.error(error);
            }
          }

          return data;
        };
        if (ticket) {
          nftTicket = decodeApiTicket(ticket.ticket.nft_ticket);
          if (nftTicket?.app_ticket) {
            appTicket = decodeApiTicket(nftTicket.app_ticket);
          }
        }
      } catch (error) {
        console.error(
          `decode nft_ticket or app_ticket error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
      }
      const collectionName = nftTicket?.collection_txid
        ? await getCollectionName(nftTicket.collection_txid)
        : '';
      const nftData = await getNftData(transactionId, nftTicket?.author);
      const nft = await nftService.getNftIdByTxId(transactionId);
      const dataEntity = {
        id: nft?.id || undefined,
        transactionHash: transactionId,
        transactionTime,
        blockHeight: ticket.height,
        key: ticket?.ticket?.key?.toString() || '',
        label: ticket?.ticket?.label?.toString() || '',
        total_copies: Number(ticket?.ticket?.total_copies) || 0,
        royalty: Number(ticket?.ticket?.royalty) || 0,
        royalty_address: ticket?.ticket?.royalty_address?.toString() || '',
        green: Boolean(ticket?.ticket?.green) || false,
        storage_fee: Number(ticket?.ticket?.storage_fee) || 0,
        author: nftTicket?.author || '',
        collection_txid: nftTicket?.collection_txid || '',
        collection_name: collectionName,
        collection_alias: collectionName
          ? `${slugify(collectionName)}-${
              nftTicket?.author?.substr(0, 10) || ''
            }`
          : '',
        creator_name: appTicket?.creator_name || '',
        creator_website: appTicket?.creator_website || '',
        creator_written_statement: appTicket?.creator_written_statement || '',
        nft_title: appTicket?.nft_title || '',
        nft_type: appTicket?.nft_type || '',
        nft_series_name: appTicket?.nft_series_name || '',
        nft_creation_video_youtube_url:
          appTicket?.nft_creation_video_youtube_url || '',
        nft_keyword_set: appTicket?.nft_keyword_set || '',
        preview_hash: appTicket?.preview_hash || '',
        thumbnail1_hash: appTicket?.thumbnail1_hash || '',
        thumbnail2_hash: appTicket?.thumbnail2_hash || '',
        data_hash: appTicket?.data_hash || '',
        original_file_size_in_bytes:
          appTicket?.original_file_size_in_bytes || 0,
        file_type: appTicket?.file_type || '',
        make_publicly_accessible: appTicket?.make_publicly_accessible || false,
        dd_and_fingerprints_ic: appTicket?.dd_and_fingerprints_ic || 0,
        dd_and_fingerprints_max: appTicket?.dd_and_fingerprints_max || 0,
        dd_and_fingerprints_ids:
          JSON.stringify(appTicket?.dd_and_fingerprints_ids) || '',
        rq_ic: appTicket?.rq_ic || 0,
        rq_max: appTicket?.rq_max || 0,
        rq_oti: appTicket?.rq_oti || '',
        rq_ids: JSON.stringify(appTicket?.rq_ids) || '',
        image: nftData?.preview_thumbnail || '',
        status: 'inactive',
        activation_ticket: '',
        ticketId: transactionId,
        rawData: JSON.stringify({ ticket, nftData }),
        version: nftData?.version || 0,
        nsfw_score: nftData?.nsfw_score || 0,
        rareness_score: nftData?.rareness_score || 0,
        is_likely_dupe: nftData?.is_likely_dupe || false,
        is_rare_on_internet: nftData?.is_rare_on_internet || false,
        drawing_nsfw_score: nftData?.drawing_nsfw_score || 0,
        neutral_nsfw_score: nftData?.neutral_nsfw_score || 0,
        sexy_nsfw_score: nftData?.sexy_nsfw_score || 0,
        porn_nsfw_score: nftData?.porn_nsfw_score || 0,
        hentai_nsfw_score: nftData?.hentai_nsfw_score || 0,
        rare_on_internet_summary_table_json_b64:
          nftData?.rare_on_internet_summary_table_json_b64 || '',
        rare: nftData?.rare_on_internet || '',
        rare_on_internet_graph_json_b64:
          nftData?.rare_on_internet_graph_json_b64 || '',
        alt_rare_on_internet_dict_json_b64:
          nftData?.alt_rare_on_internet_dict_json_b64 || '',
        min_num_exact_matches_on_page:
          nftData?.min_num_exact_matches_on_page || '',
        earliest_date_of_results: nftData?.earliest_date_of_results || '',
        description: nftData?.description || '',
        createdDate: Date.now(),
      };
      await connection.getRepository(NftEntity).save(dataEntity);
    }
    return true;
  } catch (error) {
    console.error(
      `Save nft (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );

    return false;
  }
}

export async function updateStatusForNft(
  transactionId: string,
): Promise<boolean> {
  try {
    const nftActivationTicket =
      await ticketService.getNFTActivationTicketByTxId(transactionId);
    if (nftActivationTicket) {
      await nftService.updateNftStatus(
        transactionId,
        'active',
        nftActivationTicket.rawData,
      );
    }
    return true;
  } catch (error) {
    console.error(
      `Update status for nft (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}
