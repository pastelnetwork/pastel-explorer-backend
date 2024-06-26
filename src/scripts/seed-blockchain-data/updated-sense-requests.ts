import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Connection } from 'typeorm';

import {
  SenseRequestsEntity,
  TSenseRequests,
} from '../../entity/senserequests.entity';
import { TicketEntity } from '../../entity/ticket.entity';
import senseRequestsService from '../../services/senserequests.service';
import ticketService from '../../services/ticket.service';
import { getDateErrorFormat } from '../../utils/helpers';

type TImageData = {
  imageTitle: string;
  imageDescription: string;
  isPublic: boolean;
  ipfsLink: string;
  sha256HashOfSenseResults: string;
};

export async function createSenseImage(id: string, data: string) {
  try {
    const dir = path.join(__dirname, '../../../public/sense_images');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    const fileName = `${id}.jpg`;
    fs.writeFileSync(path.join(dir, fileName), data, { encoding: 'base64' });
    return `${fileName}`;
  } catch (error) {
    console.error(`createSenseImage ${id} error: `, error);
    return '';
  }
}

export async function createSenseRawDataFile(id: string, data: string) {
  try {
    const dir = process.env.SENSE_DRAW_DATA_FOLDER;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFileSync(path.join(dir, `${id}.json`), data);
  } catch (error) {
    console.error(`create raw data of Sense ${id} error: `, error);
  }
}

export async function updateSenseRequests(
  connection: Connection,
  transactionId: string,
  imageData: TImageData,
  blockHeight: number,
  transactionTime: number,
  type = 'sense',
): Promise<string> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL) {
    return;
  } else {
    try {
      const { data: resData } = await axios.get(
        `${openNodeApiURL}/get_raw_dd_service_results_by_registration_ticket_txid/${transactionId}`,
        {
          timeout: 50000,
        },
      );
      let senseEntity: TSenseRequests = {
        imageFileHash: `nosense_${Date.now()}`,
        transactionHash: transactionId,
        rawData: '',
        blockHash: '',
        blockHeight: 0,
        currentBlockHeight: blockHeight,
        pastelIdOfSubmitter: '',
        createdDate: Date.now(),
        lastUpdated: Date.now(),
        requestType: type,
        transactionTime,
      } as TSenseRequests;
      try {
        let imageHash = '';
        let data = resData;
        if (Array.isArray(data)) {
          data = resData[0];
        }
        if (typeof data !== 'string' && data?.raw_dd_service_data_json) {
          const senseData = JSON.parse(data.raw_dd_service_data_json);
          let parsedSenseResults = '';
          if (senseData?.pastel_block_height_when_request_submitted) {
            try {
              const { data: parsedSenseResultsData } = await axios.get(
                `${openNodeApiURL}/get_parsed_dd_service_results_by_image_file_hash/${senseData.hash_of_candidate_image_file}`,
              );
              parsedSenseResults = parsedSenseResultsData;
            } catch (error) {
              console.error(
                `API get_parsed_dd_service_results_by_image_file_hash ${
                  senseData.hash_of_candidate_image_file
                } error >>> ${getDateErrorFormat()} >>>`,
                error.message,
              );
            }
            const sense =
              await senseRequestsService.getSenseByTxId(transactionId);
            let imageFileCdnUrl = '';
            if (senseData?.candidate_image_thumbnail_webp_as_base64_string) {
              imageFileCdnUrl = await createSenseImage(
                transactionId,
                senseData.candidate_image_thumbnail_webp_as_base64_string,
              );
            }
            senseEntity = {
              imageFileHash: senseData.hash_of_candidate_image_file,
              imageFileCdnUrl,
              imageTitle: imageData.imageTitle,
              imageDescription: imageData.imageDescription,
              isPublic: imageData.isPublic,
              transactionHash: transactionId,
              rawData: '',
              isLikelyDupe: senseData.is_likely_dupe,
              dupeDetectionSystemVersion:
                senseData.dupe_detection_system_version,
              openNsfwScore: senseData.open_nsfw_score,
              rarenessScore: senseData.overall_rareness_score,
              ipfsLink: imageData.ipfsLink,
              sha256HashOfSenseResults: imageData.sha256HashOfSenseResults,
              blockHash: senseData.pastel_block_hash_when_request_submitted,
              blockHeight: parseInt(
                senseData.pastel_block_height_when_request_submitted,
              ),
              utcTimestampWhenRequestSubmitted:
                senseData.utc_timestamp_when_request_submitted,
              pastelIdOfSubmitter: senseData.pastel_id_of_submitter,
              pastelIdOfRegisteringSupernode1:
                senseData.pastel_id_of_registering_supernode_1,
              pastelIdOfRegisteringSupernode2:
                senseData.pastel_id_of_registering_supernode_2,
              pastelIdOfRegisteringSupernode3:
                senseData.pastel_id_of_registering_supernode_3,
              isPastelOpenapiRequest: senseData.is_pastel_openapi_request,
              isRareOnInternet: senseData.is_rare_on_internet,
              pctOfTop10MostSimilarWithDupeProbAbove25pct:
                senseData.pct_of_top_10_most_similar_with_dupe_prob_above_25pct,
              pctOfTop10MostSimilarWithDupeProbAbove33pct:
                senseData.pct_of_top_10_most_similar_with_dupe_prob_above_33pct,
              pctOfTop10MostSimilarWithDupeProbAbove50pct:
                senseData.pct_of_top_10_most_similar_with_dupe_prob_above_50pct,
              rarenessScoresTable:
                senseData.rareness_scores_table_json_compressed_b64,
              internetRareness: JSON.stringify(senseData.internet_rareness),
              alternativeNsfwScores: JSON.stringify(
                senseData.alternative_nsfw_scores,
              ),
              imageFingerprintOfCandidateImageFile: JSON.stringify(
                senseData.image_fingerprint_of_candidate_image_file,
              ),
              parsedSenseResults: null,
              requestType: type,
              currentBlockHeight: blockHeight,
              transactionTime,
              createdDate: sense?.createdDate || Date.now(),
              lastUpdated: Date.now(),
            };
          }
          await connection.getRepository(SenseRequestsEntity).save(senseEntity);
          await createSenseRawDataFile(transactionId, JSON.stringify(data));
          if (parsedSenseResults) {
            await createSenseRawDataFile(
              `${transactionId}_parsedSenseResults`,
              JSON.stringify(parsedSenseResults),
            );
          }
          imageHash = senseData.hash_of_candidate_image_file;
          await ticketService.updateDetailIdForTicket(
            transactionId,
            transactionId,
          );
        }
        return imageHash;
      } catch (error) {
        await createSenseRawDataFile(transactionId, JSON.stringify(resData));
        await connection.getRepository(SenseRequestsEntity).save(senseEntity);
        console.error(
          `Updated sense requests (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
        return '';
      }
    } catch (error) {
      console.error(
        `Updated sense requests (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
      return '';
    }
  }
}

export async function updateSenseRequestByBlockHeight(
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
        .select('height, transactionHash, transactionTime')
        .where('height = :blockHeight', { blockHeight })
        .andWhere("type IN ('action-reg')")
        .andWhere('rawData LIKE \'%"action_type":"sense"%\'')
        .getRawMany();
    }
    const imageData = {
      imageTitle: '',
      imageDescription: '',
      isPublic: true,
      ipfsLink: '',
      sha256HashOfSenseResults: '',
    };

    for (let i = 0; i < ticketList.length; i++) {
      await updateSenseRequests(
        connection,
        ticketList[i].transactionHash,
        imageData,
        blockHeight,
        ticketList[i].transactionTime,
      );
    }
  } catch (error) {
    console.error(
      `Updated sense requests (Block height: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}

export async function updateSenseRequestsByTxId(
  connection: Connection,
  txId: string,
): Promise<boolean> {
  try {
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
    const ticketRepo = connection.getRepository(TicketEntity);
    const ticketList = await ticketRepo
      .createQueryBuilder()
      .select('transactionHash, transactionTime, height')
      .where('transactionHash = :txId', { txId })
      .andWhere("type IN ('action-reg')")
      .andWhere('rawData LIKE \'%"action_type":"sense"%\'')
      .andWhere('height >= :hideToBlock', { hideToBlock })
      .getRawMany();
    const imageData = {
      imageTitle: '',
      imageDescription: '',
      isPublic: true,
      ipfsLink: '',
      sha256HashOfSenseResults: '',
    };
    for (let i = 0; i < ticketList.length; i++) {
      await updateSenseRequests(
        connection,
        txId,
        imageData,
        ticketList[i].height,
        ticketList[i].transactionTime,
      );
    }
  } catch (error) {
    console.error(
      `Updated sense requests (txID: ${txId}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}

export async function updateSenseRequestsData(
  transactionId: string,
  imageData: TImageData,
  blockHeight: number,
  transactionTime: number,
  type = 'sense',
): Promise<string> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (blockHeight < hideToBlock) {
    return;
  }
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL) {
    return;
  } else {
    try {
      const { data: resData } = await axios.get(
        `${openNodeApiURL}/get_raw_dd_service_results_by_registration_ticket_txid/${transactionId}`,
        {
          timeout: 50000,
        },
      );
      let senseEntity: TSenseRequests = {
        imageFileHash: `nosense_${Date.now()}`,
        transactionHash: transactionId,
        rawData: JSON.stringify(resData),
        blockHash: '',
        blockHeight: 0,
        currentBlockHeight: blockHeight,
        pastelIdOfSubmitter: '',
        createdDate: Date.now(),
        lastUpdated: Date.now(),
        requestType: type,
        transactionTime,
      } as TSenseRequests;
      try {
        let imageHash = '';
        let data = resData;
        if (Array.isArray(data)) {
          data = resData[0];
        }
        if (typeof data !== 'string' && data?.raw_dd_service_data_json) {
          const senseData = JSON.parse(data.raw_dd_service_data_json);
          let parsedSenseResults = '';
          if (senseData?.pastel_block_height_when_request_submitted) {
            try {
              const { data: parsedSenseResultsData } = await axios.get(
                `${openNodeApiURL}/get_parsed_dd_service_results_by_image_file_hash/${senseData.hash_of_candidate_image_file}`,
              );
              parsedSenseResults = parsedSenseResultsData;
            } catch (error) {
              console.error(
                `API get_parsed_dd_service_results_by_image_file_hash ${
                  senseData.hash_of_candidate_image_file
                } error >>> ${getDateErrorFormat()} >>>`,
                error.message,
              );
            }
            const sense =
              await senseRequestsService.getSenseByTxId(transactionId);
            let imageFileCdnUrl = '';
            if (senseData?.candidate_image_thumbnail_webp_as_base64_string) {
              imageFileCdnUrl = await createSenseImage(
                transactionId,
                senseData.candidate_image_thumbnail_webp_as_base64_string,
              );
            }
            senseEntity = {
              imageFileHash: senseData.hash_of_candidate_image_file,
              imageFileCdnUrl,
              imageTitle: imageData.imageTitle,
              imageDescription: imageData.imageDescription,
              isPublic: imageData.isPublic,
              transactionHash: transactionId,
              rawData: '',
              isLikelyDupe: senseData.is_likely_dupe,
              dupeDetectionSystemVersion:
                senseData.dupe_detection_system_version,
              openNsfwScore: senseData.open_nsfw_score,
              rarenessScore: senseData.overall_rareness_score,
              ipfsLink: imageData.ipfsLink,
              sha256HashOfSenseResults: imageData.sha256HashOfSenseResults,
              blockHash: senseData.pastel_block_hash_when_request_submitted,
              blockHeight: parseInt(
                senseData.pastel_block_height_when_request_submitted,
              ),
              utcTimestampWhenRequestSubmitted:
                senseData.utc_timestamp_when_request_submitted,
              pastelIdOfSubmitter: senseData.pastel_id_of_submitter,
              pastelIdOfRegisteringSupernode1:
                senseData.pastel_id_of_registering_supernode_1,
              pastelIdOfRegisteringSupernode2:
                senseData.pastel_id_of_registering_supernode_2,
              pastelIdOfRegisteringSupernode3:
                senseData.pastel_id_of_registering_supernode_3,
              isPastelOpenapiRequest: senseData.is_pastel_openapi_request,
              isRareOnInternet: senseData.is_rare_on_internet,
              pctOfTop10MostSimilarWithDupeProbAbove25pct:
                senseData.pct_of_top_10_most_similar_with_dupe_prob_above_25pct,
              pctOfTop10MostSimilarWithDupeProbAbove33pct:
                senseData.pct_of_top_10_most_similar_with_dupe_prob_above_33pct,
              pctOfTop10MostSimilarWithDupeProbAbove50pct:
                senseData.pct_of_top_10_most_similar_with_dupe_prob_above_50pct,
              rarenessScoresTable:
                senseData.rareness_scores_table_json_compressed_b64,
              internetRareness: JSON.stringify(senseData.internet_rareness),
              alternativeNsfwScores: JSON.stringify(
                senseData.alternative_nsfw_scores,
              ),
              imageFingerprintOfCandidateImageFile: JSON.stringify(
                senseData.image_fingerprint_of_candidate_image_file,
              ),
              parsedSenseResults: null,
              requestType: type,
              currentBlockHeight: blockHeight,
              transactionTime,
              createdDate: sense?.createdDate || Date.now(),
              lastUpdated: Date.now(),
            };
          }
          senseRequestsService.save(senseEntity);
          await createSenseRawDataFile(transactionId, JSON.stringify(data));
          if (parsedSenseResults) {
            await createSenseRawDataFile(
              `${transactionId}_parsedSenseResults`,
              JSON.stringify(parsedSenseResults),
            );
          }
          imageHash = senseData.hash_of_candidate_image_file;
          await ticketService.updateDetailIdForTicket(
            transactionId,
            transactionId,
          );
        }
        return imageHash;
      } catch (error) {
        senseRequestsService.save(senseEntity);
        console.error(
          `Updated sense requests (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
        return '';
      }
    } catch (error) {
      console.error(
        `Updated sense requests (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
      return '';
    }
  }
}
