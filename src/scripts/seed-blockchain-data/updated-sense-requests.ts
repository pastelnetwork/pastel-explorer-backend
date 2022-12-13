import axios from 'axios';
import { decode } from 'js-base64';
import { Connection } from 'typeorm';

import { SenseRequestsEntity } from '../../entity/senserequests.entity';
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
      if (data?.file) {
        const senseData = JSON.parse(decode(data.file));
        await connection.getRepository(SenseRequestsEntity).save({
          imageFileHash: senseData.hash_of_candidate_image_file,
          imageFileCdnUrl: `https://res.cloudinary.com/pastelnetwork/image/upload/v1/sense_demo/${senseData.hash_of_candidate_image_file}.jpg`,
          imageTitle: imageData.imageTitle,
          imageDescription: imageData.imageDescription,
          isPublic: imageData.isPublic,
          transactionHash: transactionId,
          rawData: JSON.stringify(data),
          isLikelyDupe: senseData.is_likely_dupe,
          dupeDetectionSystemVersion: data.dupe_detection_system_version,
          openNsfwScore: data.open_nsfw_score,
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
          type,
        });
      }
      return true;
    } catch (err) {
      console.error(
        `File updated-sense-requests.ts error >>> ${getDateErrorFormat()} >>>`,
        err,
      );
      return false;
    }
  }
}
