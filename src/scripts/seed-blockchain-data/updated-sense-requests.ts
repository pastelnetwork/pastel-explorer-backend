import axios from 'axios';
import { decode } from 'js-base64';
import { Connection } from 'typeorm';

import { SenseRequestsEntity } from '../../entity/senserequests.entity';
import senserequestsService from '../../services/senserequests.service';
import { getDateErrorFormat } from '../../utils/helpers';

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
  type = 'sense',
): Promise<boolean> {
  const pastelId = process.env.PASTELID;
  const passphrase = process.env.PASSPHRASE;
  const walletNodeApiURL = process.env.WALLETNODE_API_URL;

  if (!pastelId || !passphrase || !walletNodeApiURL) {
    return;
  } else {
    try {
      const { data } = await axios.get(
        `${walletNodeApiURL}/openapi/sense/download`,
        {
          params: {
            pid: pastelId,
            txid: transactionId,
          },
          headers: {
            Authorization: passphrase,
          },
        },
      );
      let senseEntity: SenseRequestsEntity = {
        imageFileHash: `nosense_${Date.now()}`,
        transactionHash: transactionId,
        rawData: JSON.stringify(data),
        blockHash: '',
        blockHeight: 0,
        pastelIdOfSubmitter: '',
        createdDate: Date.now(),
        lastUpdated: Date.now(),
        requestType: type,
      } as SenseRequestsEntity;
      if (data?.file) {
        const senseData = JSON.parse(
          decode(data.file).replace(
            'overall_rareness_score ',
            'overall_rareness_score',
          ),
        );
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
          createdDate: Date.now(),
          lastUpdated: Date.now(),
          requestType: type,
        };
      }
      const existSense = await senserequestsService.getSenseByTxId(
        transactionId,
      );
      if (existSense?.imageFileHash) {
        await connection
          .getRepository(SenseRequestsEntity)
          .createQueryBuilder()
          .update(senseEntity)
          .where({ imageFileHash: existSense.imageFileHash })
          .execute();
      } else {
        await connection.getRepository(SenseRequestsEntity).insert(senseEntity);
      }
      return true;
    } catch (error) {
      console.error(
        `File updated-sense-requests.ts error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
      return false;
    }
  }
}
