import axios from 'axios';
import { Connection } from 'typeorm';

import {
  SenseRequestsEntity,
  TSenseRequests,
} from '../../entity/senserequests.entity';
import senseRequestsService from '../../services/senserequests.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { updateSenseScreenshots } from '../sense-screenshots';

type TImageData = {
  imageTitle: string;
  imageDescription: string;
  isPublic: boolean;
  ipfsLink: string;
  sha256HashOfSenseResults: string;
};

export async function updateSenseRequests(
  connection: Connection,
  transactionId: string,
  imageData: TImageData,
  blockHeight: number,
  type = 'sense',
): Promise<boolean> {
  const openNodeApiURL = process.env.OPENNODE_API_URL;
  if (!openNodeApiURL) {
    return;
  } else {
    try {
      const { data } = await axios.get(
        `${openNodeApiURL}/get_raw_sense_results_by_registration_ticket_txid/${transactionId}`,
      );
      if (data) {
        const senseData = JSON.parse(
          data.raw_sense_data_json.replace(
            'overall_rareness_score ',
            'overall_rareness_score',
          ),
        );
        let senseEntity: TSenseRequests = {
          imageFileHash: `nosense_${Date.now()}`,
          transactionHash: transactionId,
          rawData: JSON.stringify(data),
          blockHash: '',
          blockHeight: 0,
          currentBlockHeight: blockHeight,
          pastelIdOfSubmitter: '',
          createdDate: Date.now(),
          lastUpdated: Date.now(),
          requestType: type,
        } as TSenseRequests;
        if (senseData?.pastel_block_height_when_request_submitted) {
          let parsedSenseResults = '';
          try {
            const { data: parsedSenseResultsData } = await axios.get(
              `${openNodeApiURL}/get_parsed_sense_results_by_image_file_hash/${senseData.hash_of_candidate_image_file}`,
            );
            parsedSenseResults = parsedSenseResultsData;
          } catch (error) {
            console.error(
              `API get_parsed_sense_results_by_image_file_hash ${
                senseData.hash_of_candidate_image_file
              } error >>> ${getDateErrorFormat()} >>>`,
              error.message,
            );
          }
          senseEntity = {
            imageFileHash: senseData.hash_of_candidate_image_file,
            imageFileCdnUrl: '',
            imageTitle: imageData.imageTitle,
            imageDescription: imageData.imageDescription,
            isPublic: imageData.isPublic,
            transactionHash: transactionId,
            rawData: JSON.stringify(data),
            isLikelyDupe: senseData.is_likely_dupe,
            dupeDetectionSystemVersion: senseData.dupe_detection_system_version,
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
            openApiSubsetIdString: senseData.open_api_subset_id_string,
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
            parsedSenseResults: parsedSenseResults
              ? JSON.stringify(parsedSenseResults)
              : null,
            requestType: type,
            currentBlockHeight: blockHeight,
            createdDate: Date.now(),
            lastUpdated: Date.now(),
          };
        }
        const existSense =
          await senseRequestsService.getSenseByTxIdAndImageHash(
            transactionId,
            senseData.hash_of_candidate_image_file,
          );
        if (existSense?.imageFileHash) {
          await connection
            .getRepository(SenseRequestsEntity)
            .createQueryBuilder()
            .update(senseEntity)
            .where({
              imageFileHash: existSense.imageFileHash,
              transactionHash: transactionId,
            })
            .execute();
        } else {
          await connection
            .getRepository(SenseRequestsEntity)
            .insert(senseEntity);
        }
        await updateSenseScreenshots(
          senseData.hash_of_candidate_image_file,
          transactionId,
        );
      }
      return true;
    } catch (error) {
      console.error(
        `Updated sense requests (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
      return false;
    }
  }
}
