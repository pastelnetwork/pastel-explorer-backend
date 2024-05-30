import axios from 'axios';
import { decode } from 'js-base64';
import slugify from 'slugify';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { NftEntity } from '../../entity/nft.entity';
import { TicketEntity } from '../../entity/ticket.entity';
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

const getNftData = async (txId: string) => {
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL) {
    return;
  }

  try {
    const { data: resData } = await axios.get(
      `${openNodeApiURL}/get_raw_dd_service_results_by_registration_ticket_txid/${txId}`,
      {
        timeout: 50000,
      },
    );
    let data = resData;
    if (Array.isArray(data)) {
      data = resData[0];
    }
    return data;
  } catch (error) {
    console.error(
      `Get NFT (txId: ${txId}) error >>> ${getDateErrorFormat()} >>>`,
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
  status = 'inactive',
): Promise<boolean> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
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
      try {
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
        const nftData = await getNftData(transactionId);
        let rawDdServiceDataJson = null;
        if (nftData?.raw_dd_service_data_json) {
          rawDdServiceDataJson = JSON.parse(nftData.raw_dd_service_data_json);
        }
        const nft = await nftService.getNftIdByTxId(transactionId);
        const dataEntity = {
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
          make_publicly_accessible:
            appTicket?.make_publicly_accessible || false,
          dd_and_fingerprints_ic: appTicket?.dd_and_fingerprints_ic || 0,
          dd_and_fingerprints_max: appTicket?.dd_and_fingerprints_max || 0,
          dd_and_fingerprints_ids:
            JSON.stringify(appTicket?.dd_and_fingerprints_ids) || '',
          rq_ic: appTicket?.rq_ic || 0,
          rq_max: appTicket?.rq_max || 0,
          rq_oti: appTicket?.rq_oti || '',
          rq_ids: JSON.stringify(appTicket?.rq_ids) || '',
          preview_thumbnail:
            rawDdServiceDataJson?.candidate_image_thumbnail_webp_as_base64_string ||
            '',
          status,
          activation_ticket: '',
          ticketId: transactionId,
          rawData: JSON.stringify({ ticket, nftData }),
          pastel_block_hash_when_request_submitted:
            rawDdServiceDataJson?.pastel_block_hash_when_request_submitted,
          pastel_block_height_when_request_submitted:
            rawDdServiceDataJson?.pastel_block_height_when_request_submitted,
          utc_timestamp_when_request_submitted:
            rawDdServiceDataJson?.utc_timestamp_when_request_submitted,
          pastel_id_of_submitter: rawDdServiceDataJson?.pastel_id_of_submitter,
          pastel_id_of_registering_supernode_1:
            rawDdServiceDataJson?.pastel_id_of_registering_supernode_1,
          pastel_id_of_registering_supernode_2:
            rawDdServiceDataJson?.pastel_id_of_registering_supernode_2,
          pastel_id_of_registering_supernode_3:
            rawDdServiceDataJson?.pastel_id_of_registering_supernode_3,
          is_pastel_openapi_request:
            rawDdServiceDataJson?.is_pastel_openapi_request,
          dupe_detection_system_version:
            rawDdServiceDataJson?.dupe_detection_system_version,
          is_likely_dupe: rawDdServiceDataJson?.is_likely_dupe,
          is_rare_on_internet: rawDdServiceDataJson?.is_rare_on_internet,
          overall_rareness_score: rawDdServiceDataJson?.overall_rareness_score,
          pct_of_top_10_most_similar_with_dupe_prob_above_25pct:
            rawDdServiceDataJson?.pct_of_top_10_most_similar_with_dupe_prob_above_25pct,
          pct_of_top_10_most_similar_with_dupe_prob_above_33pct:
            rawDdServiceDataJson?.pct_of_top_10_most_similar_with_dupe_prob_above_33pct,
          pct_of_top_10_most_similar_with_dupe_prob_above_50pct:
            rawDdServiceDataJson?.pct_of_top_10_most_similar_with_dupe_prob_above_50pct,
          rareness_scores_table_json_compressed_b64:
            rawDdServiceDataJson?.rareness_scores_table_json_compressed_b64,
          open_nsfw_score: rawDdServiceDataJson?.open_nsfw_score,
          image_fingerprint_of_candidate_image_file: JSON.stringify(
            rawDdServiceDataJson?.image_fingerprint_of_candidate_image_file,
          ),
          hash_of_candidate_image_file:
            rawDdServiceDataJson?.hash_of_candidate_image_file,
          collection_name_string: rawDdServiceDataJson?.collection_name_string,
          open_api_group_id_string:
            rawDdServiceDataJson?.open_api_group_id_string,
          group_rareness_score: rawDdServiceDataJson?.group_rareness_score,
          candidate_image_thumbnail_webp_as_base64_string:
            rawDdServiceDataJson?.candidate_image_thumbnail_webp_as_base64_string,
          does_not_impact_the_following_collection_strings:
            rawDdServiceDataJson?.does_not_impact_the_following_collection_strings,
          is_invalid_sense_request:
            rawDdServiceDataJson?.is_invalid_sense_request,
          invalid_sense_request_reason:
            rawDdServiceDataJson?.invalid_sense_request_reason,
          similarity_score_to_first_entry_in_collection:
            rawDdServiceDataJson?.similarity_score_to_first_entry_in_collection,
          cp_probability: rawDdServiceDataJson?.cp_probability,
          nsfw_score: rawDdServiceDataJson?.nsfw_score,
          child_probability: rawDdServiceDataJson?.child_probability,
          image_file_path: rawDdServiceDataJson?.image_file_path,
          internet_rareness: JSON.stringify(
            rawDdServiceDataJson?.internet_rareness,
          ),
          alternative_nsfw_scores: JSON.stringify(
            rawDdServiceDataJson?.alternative_nsfw_scores,
          ),
          max_permitted_open_nsfw_score:
            rawDdServiceDataJson?.max_permitted_open_nsfw_score,
          description: rawDdServiceDataJson?.description,
          createdDate: nft?.createdDate || Date.now(),
        };
        await connection.getRepository(NftEntity).save(dataEntity);
        await ticketService.updateDetailIdForTicket(
          transactionId,
          transactionId,
        );
      } catch (error) {
        await connection.getRepository(NftEntity).save({
          transactionHash: transactionId,
          transactionTime,
          rawData: JSON.stringify({ ticket: tickets }),
          createdDate: Date.now(),
          blockHeight: 0,
        });
        console.error(
          `Save nft (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
      }
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

export async function updateNftByBlockHeight(
  connection: Connection,
  blockHeight: number,
  tickets?: ITicketList[],
): Promise<boolean> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
  try {
    const ticketRepo = connection.getRepository(TicketEntity);
    let ticketList = tickets;
    if (!tickets?.length) {
      ticketList = await ticketRepo
        .createQueryBuilder()
        .select('transactionHash, transactionTime')
        .where('height = :blockHeight', { blockHeight })
        .andWhere("type = 'nft-reg'")
        .getRawMany();
    }
    for (let i = 0; i < ticketList.length; i++) {
      let status = 'inactive';
      const actionActTicket = await ticketService.getActionIdTicket(
        ticketList[i].transactionHash,
        'nft-act',
      );
      if (actionActTicket?.transactionHash) {
        status = 'active';
      }
      await saveNftInfo(
        connection,
        ticketList[i].transactionHash,
        ticketList[i].transactionTime,
        blockHeight,
        status,
      );
    }
  } catch (error) {
    console.error(
      `Update NFT (Block height: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}

export async function updateNftByTxID(
  connection: Connection,
  txID: string,
): Promise<boolean> {
  try {
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
    const ticketRepo = connection.getRepository(TicketEntity);
    const ticketList = await ticketRepo
      .createQueryBuilder()
      .select('height, transactionHash, transactionTime')
      .where('transactionHash = :txID', { txID })
      .andWhere("type = 'nft-reg'")
      .andWhere('height >= :hideToBlock', { hideToBlock })
      .getRawMany();
    for (let i = 0; i < ticketList.length; i++) {
      let status = 'inactive';
      const actionActTicket = await ticketService.getActionIdTicket(
        ticketList[i].transactionHash,
        'nft-act',
      );
      if (actionActTicket?.transactionHash) {
        status = 'active';
      }
      await saveNftInfo(
        connection,
        txID,
        ticketList[i].transactionTime,
        ticketList[i].height,
        status,
      );
    }
  } catch (error) {
    console.error(
      `Update NFT (txID: ${txID}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}

export async function saveNftData(
  transactionId: string,
  transactionTime: number,
  blockHeight: number,
  status = 'inactive',
): Promise<boolean> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
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
      try {
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
        const nftData = await getNftData(transactionId);
        let rawDdServiceDataJson = null;
        if (nftData?.raw_dd_service_data_json) {
          rawDdServiceDataJson = JSON.parse(nftData.raw_dd_service_data_json);
        }
        const nft = await nftService.getNftIdByTxId(transactionId);
        const dataEntity = {
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
          make_publicly_accessible:
            appTicket?.make_publicly_accessible || false,
          dd_and_fingerprints_ic: appTicket?.dd_and_fingerprints_ic || 0,
          dd_and_fingerprints_max: appTicket?.dd_and_fingerprints_max || 0,
          dd_and_fingerprints_ids:
            JSON.stringify(appTicket?.dd_and_fingerprints_ids) || '',
          rq_ic: appTicket?.rq_ic || 0,
          rq_max: appTicket?.rq_max || 0,
          rq_oti: appTicket?.rq_oti || '',
          rq_ids: JSON.stringify(appTicket?.rq_ids) || '',
          preview_thumbnail:
            rawDdServiceDataJson?.candidate_image_thumbnail_webp_as_base64_string ||
            '',
          status,
          activation_ticket: '',
          ticketId: transactionId,
          rawData: JSON.stringify({ ticket, nftData }),
          pastel_block_hash_when_request_submitted:
            rawDdServiceDataJson?.pastel_block_hash_when_request_submitted,
          pastel_block_height_when_request_submitted:
            rawDdServiceDataJson?.pastel_block_height_when_request_submitted,
          utc_timestamp_when_request_submitted:
            rawDdServiceDataJson?.utc_timestamp_when_request_submitted,
          pastel_id_of_submitter: rawDdServiceDataJson?.pastel_id_of_submitter,
          pastel_id_of_registering_supernode_1:
            rawDdServiceDataJson?.pastel_id_of_registering_supernode_1,
          pastel_id_of_registering_supernode_2:
            rawDdServiceDataJson?.pastel_id_of_registering_supernode_2,
          pastel_id_of_registering_supernode_3:
            rawDdServiceDataJson?.pastel_id_of_registering_supernode_3,
          is_pastel_openapi_request:
            rawDdServiceDataJson?.is_pastel_openapi_request,
          dupe_detection_system_version:
            rawDdServiceDataJson?.dupe_detection_system_version,
          is_likely_dupe: rawDdServiceDataJson?.is_likely_dupe,
          is_rare_on_internet: rawDdServiceDataJson?.is_rare_on_internet,
          overall_rareness_score: rawDdServiceDataJson?.overall_rareness_score,
          pct_of_top_10_most_similar_with_dupe_prob_above_25pct:
            rawDdServiceDataJson?.pct_of_top_10_most_similar_with_dupe_prob_above_25pct,
          pct_of_top_10_most_similar_with_dupe_prob_above_33pct:
            rawDdServiceDataJson?.pct_of_top_10_most_similar_with_dupe_prob_above_33pct,
          pct_of_top_10_most_similar_with_dupe_prob_above_50pct:
            rawDdServiceDataJson?.pct_of_top_10_most_similar_with_dupe_prob_above_50pct,
          rareness_scores_table_json_compressed_b64:
            rawDdServiceDataJson?.rareness_scores_table_json_compressed_b64,
          open_nsfw_score: rawDdServiceDataJson?.open_nsfw_score,
          image_fingerprint_of_candidate_image_file: JSON.stringify(
            rawDdServiceDataJson?.image_fingerprint_of_candidate_image_file,
          ),
          hash_of_candidate_image_file:
            rawDdServiceDataJson?.hash_of_candidate_image_file,
          collection_name_string: rawDdServiceDataJson?.collection_name_string,
          open_api_group_id_string:
            rawDdServiceDataJson?.open_api_group_id_string,
          group_rareness_score: rawDdServiceDataJson?.group_rareness_score,
          candidate_image_thumbnail_webp_as_base64_string:
            rawDdServiceDataJson?.candidate_image_thumbnail_webp_as_base64_string,
          does_not_impact_the_following_collection_strings:
            rawDdServiceDataJson?.does_not_impact_the_following_collection_strings,
          is_invalid_sense_request:
            rawDdServiceDataJson?.is_invalid_sense_request,
          invalid_sense_request_reason:
            rawDdServiceDataJson?.invalid_sense_request_reason,
          similarity_score_to_first_entry_in_collection:
            rawDdServiceDataJson?.similarity_score_to_first_entry_in_collection,
          cp_probability: rawDdServiceDataJson?.cp_probability,
          nsfw_score: rawDdServiceDataJson?.nsfw_score,
          child_probability: rawDdServiceDataJson?.child_probability,
          image_file_path: rawDdServiceDataJson?.image_file_path,
          internet_rareness: JSON.stringify(
            rawDdServiceDataJson?.internet_rareness,
          ),
          alternative_nsfw_scores: JSON.stringify(
            rawDdServiceDataJson?.alternative_nsfw_scores,
          ),
          max_permitted_open_nsfw_score:
            rawDdServiceDataJson?.max_permitted_open_nsfw_score,
          description: rawDdServiceDataJson?.description,
          createdDate: nft?.createdDate || Date.now(),
        };
        await nftService.save(dataEntity);
        await ticketService.updateDetailIdForTicket(
          transactionId,
          transactionId,
        );
      } catch (error) {
        await nftService.save({
          transactionHash: transactionId,
          transactionTime,
          rawData: JSON.stringify({ ticket: tickets }),
          createdDate: Date.now(),
          blockHeight: 0,
        });
        console.error(
          `Save nft (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
      }
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
