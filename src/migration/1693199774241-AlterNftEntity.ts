import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterNftEntity1693199774241 implements MigrationInterface {
  name = 'AlterNftEntity1693199774241';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_NftEntity" ("transactionHash" varchar NOT NULL, "transactionTime" integer, "blockHeight" integer NOT NULL, "key" varchar, "label" varchar, "total_copies" integer, "royalty" integer, "royalty_address" varchar, "green" boolean, "storage_fee" integer, "author" varchar, "collection_txid" varchar, "collection_name" varchar, "collection_alias" varchar, "creator_name" varchar, "creator_website" varchar, "creator_written_statement" varchar, "nft_title" varchar, "nft_type" varchar, "nft_series_name" varchar, "nft_creation_video_youtube_url" varchar, "nft_keyword_set" varchar, "preview_hash" varchar, "thumbnail1_hash" varchar, "thumbnail2_hash" varchar, "data_hash" varchar, "original_file_size_in_bytes" integer, "file_type" varchar, "make_publicly_accessible" boolean, "dd_and_fingerprints_ic" integer, "dd_and_fingerprints_max" integer, "dd_and_fingerprints_ids" varchar, "rq_ic" integer, "rq_max" integer, "rq_ids" varchar, "rq_oti" varchar, "status" varchar, "activation_ticket" varchar, "ticketId" varchar, "rawData" varchar NOT NULL, "createdDate" integer NOT NULL, "version" integer, "nsfw_score" integer, "is_likely_dupe" boolean, "is_rare_on_internet" boolean, "preview_thumbnail" varchar, "description" varchar, "pastel_block_hash_when_request_submitted" varchar, "pastel_block_height_when_request_submitted" integer, "utc_timestamp_when_request_submitted" varchar, "pastel_id_of_submitter" varchar, "pastel_id_of_registering_supernode_1" varchar, "pastel_id_of_registering_supernode_2" varchar, "pastel_id_of_registering_supernode_3" varchar, "is_pastel_openapi_request" boolean, "dupe_detection_system_version" varchar, "overall_rareness_score" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_25pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_33pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_50pct" integer, "rareness_scores_table_json_compressed_b64" varchar, "open_nsfw_score" integer, "image_fingerprint_of_candidate_image_file" varchar, "hash_of_candidate_image_file" varchar, "collection_name_string" varchar, "open_api_group_id_string" varchar, "group_rareness_score" integer, "candidate_image_thumbnail_webp_as_base64_string" varchar, "does_not_impact_the_following_collection_strings" varchar, "is_invalid_sense_request" varchar, "invalid_sense_request_reason" varchar, "similarity_score_to_first_entry_in_collection" integer, "cp_probability" integer, "child_probability" integer, "image_file_path" varchar, "internet_rareness" varchar, "alternative_nsfw_scores" varchar, "max_permitted_open_nsfw_score" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_NftEntity"("transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score") SELECT "transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score" FROM "NftEntity"`,
    );
    await queryRunner.query(`DROP TABLE "NftEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_NftEntity" RENAME TO "NftEntity"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81376f4c43bea45af5d5acaee0" ON "NftEntity" ("createdDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_659d24fe1d8170e3f9d76564a2" ON "NftEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78b033f14126ecf93afc3c994b" ON "NftEntity" ("collection_alias") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4169fbd3cb93fd04dfaa0aa34d" ON "NftEntity" ("collection_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b55d7eef628b7f23c8d29896c5" ON "NftEntity" ("collection_txid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8acf55a80e79f4b1784da5f1a9" ON "NftEntity" ("author") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd6438e69e7a90ee241b3d58ef" ON "NftEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d52605676b9ead33449df8c25" ON "NftEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52c53671d80d20b8e991a93406" ON "NftEntity" ("version") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a2a7bc449ad94c8f777d04390" ON "NftEntity" ("preview_thumbnail") `,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_NftEntity" ("transactionHash" varchar(64) PRIMARY KEY NOT NULL, "transactionTime" integer, "blockHeight" integer NOT NULL, "key" varchar, "label" varchar, "total_copies" integer, "royalty" integer, "royalty_address" varchar, "green" boolean, "storage_fee" integer, "author" varchar, "collection_txid" varchar, "collection_name" varchar, "collection_alias" varchar, "creator_name" varchar, "creator_website" varchar, "creator_written_statement" varchar, "nft_title" varchar, "nft_type" varchar, "nft_series_name" varchar, "nft_creation_video_youtube_url" varchar, "nft_keyword_set" varchar, "preview_hash" varchar, "thumbnail1_hash" varchar, "thumbnail2_hash" varchar, "data_hash" varchar, "original_file_size_in_bytes" integer, "file_type" varchar, "make_publicly_accessible" boolean, "dd_and_fingerprints_ic" integer, "dd_and_fingerprints_max" integer, "dd_and_fingerprints_ids" varchar, "rq_ic" integer, "rq_max" integer, "rq_ids" varchar, "rq_oti" varchar, "status" varchar, "activation_ticket" varchar, "ticketId" varchar, "rawData" varchar NOT NULL, "createdDate" integer NOT NULL, "version" integer, "nsfw_score" integer, "is_likely_dupe" boolean, "is_rare_on_internet" boolean, "preview_thumbnail" varchar, "description" varchar, "pastel_block_hash_when_request_submitted" varchar, "pastel_block_height_when_request_submitted" integer, "utc_timestamp_when_request_submitted" varchar, "pastel_id_of_submitter" varchar, "pastel_id_of_registering_supernode_1" varchar, "pastel_id_of_registering_supernode_2" varchar, "pastel_id_of_registering_supernode_3" varchar, "is_pastel_openapi_request" boolean, "dupe_detection_system_version" varchar, "overall_rareness_score" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_25pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_33pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_50pct" integer, "rareness_scores_table_json_compressed_b64" varchar, "open_nsfw_score" integer, "image_fingerprint_of_candidate_image_file" varchar, "hash_of_candidate_image_file" varchar, "collection_name_string" varchar, "open_api_group_id_string" varchar, "group_rareness_score" integer, "candidate_image_thumbnail_webp_as_base64_string" varchar, "does_not_impact_the_following_collection_strings" varchar, "is_invalid_sense_request" varchar, "invalid_sense_request_reason" varchar, "similarity_score_to_first_entry_in_collection" integer, "cp_probability" integer, "child_probability" integer, "image_file_path" varchar, "internet_rareness" varchar, "alternative_nsfw_scores" varchar, "max_permitted_open_nsfw_score" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_NftEntity"("transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score") SELECT "transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score" FROM "NftEntity"`,
    );
    await queryRunner.query(`DROP TABLE "NftEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_NftEntity" RENAME TO "NftEntity"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81376f4c43bea45af5d5acaee0" ON "NftEntity" ("createdDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_659d24fe1d8170e3f9d76564a2" ON "NftEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78b033f14126ecf93afc3c994b" ON "NftEntity" ("collection_alias") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4169fbd3cb93fd04dfaa0aa34d" ON "NftEntity" ("collection_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b55d7eef628b7f23c8d29896c5" ON "NftEntity" ("collection_txid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8acf55a80e79f4b1784da5f1a9" ON "NftEntity" ("author") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd6438e69e7a90ee241b3d58ef" ON "NftEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d52605676b9ead33449df8c25" ON "NftEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52c53671d80d20b8e991a93406" ON "NftEntity" ("version") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a2a7bc449ad94c8f777d04390" ON "NftEntity" ("preview_thumbnail") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "NftEntity" RENAME TO "temporary_NftEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "NftEntity" ("transactionHash" varchar NOT NULL, "transactionTime" integer, "blockHeight" integer NOT NULL, "key" varchar, "label" varchar, "total_copies" integer, "royalty" integer, "royalty_address" varchar, "green" boolean, "storage_fee" integer, "author" varchar, "collection_txid" varchar, "collection_name" varchar, "collection_alias" varchar, "creator_name" varchar, "creator_website" varchar, "creator_written_statement" varchar, "nft_title" varchar, "nft_type" varchar, "nft_series_name" varchar, "nft_creation_video_youtube_url" varchar, "nft_keyword_set" varchar, "preview_hash" varchar, "thumbnail1_hash" varchar, "thumbnail2_hash" varchar, "data_hash" varchar, "original_file_size_in_bytes" integer, "file_type" varchar, "make_publicly_accessible" boolean, "dd_and_fingerprints_ic" integer, "dd_and_fingerprints_max" integer, "dd_and_fingerprints_ids" varchar, "rq_ic" integer, "rq_max" integer, "rq_ids" varchar, "rq_oti" varchar, "status" varchar, "activation_ticket" varchar, "ticketId" varchar, "rawData" varchar NOT NULL, "createdDate" integer NOT NULL, "version" integer, "nsfw_score" integer, "is_likely_dupe" boolean, "is_rare_on_internet" boolean, "preview_thumbnail" varchar, "description" varchar, "pastel_block_hash_when_request_submitted" varchar, "pastel_block_height_when_request_submitted" integer, "utc_timestamp_when_request_submitted" varchar, "pastel_id_of_submitter" varchar, "pastel_id_of_registering_supernode_1" varchar, "pastel_id_of_registering_supernode_2" varchar, "pastel_id_of_registering_supernode_3" varchar, "is_pastel_openapi_request" boolean, "dupe_detection_system_version" varchar, "overall_rareness_score" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_25pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_33pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_50pct" integer, "rareness_scores_table_json_compressed_b64" varchar, "open_nsfw_score" integer, "image_fingerprint_of_candidate_image_file" varchar, "hash_of_candidate_image_file" varchar, "collection_name_string" varchar, "open_api_group_id_string" varchar, "group_rareness_score" integer, "candidate_image_thumbnail_webp_as_base64_string" varchar, "does_not_impact_the_following_collection_strings" varchar, "is_invalid_sense_request" varchar, "invalid_sense_request_reason" varchar, "similarity_score_to_first_entry_in_collection" integer, "cp_probability" integer, "child_probability" integer, "image_file_path" varchar, "internet_rareness" varchar, "alternative_nsfw_scores" varchar, "max_permitted_open_nsfw_score" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "NftEntity"("transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score") SELECT "transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score" FROM "temporary_NftEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_NftEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_3a2a7bc449ad94c8f777d04390" ON "NftEntity" ("preview_thumbnail") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52c53671d80d20b8e991a93406" ON "NftEntity" ("version") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d52605676b9ead33449df8c25" ON "NftEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd6438e69e7a90ee241b3d58ef" ON "NftEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8acf55a80e79f4b1784da5f1a9" ON "NftEntity" ("author") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b55d7eef628b7f23c8d29896c5" ON "NftEntity" ("collection_txid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4169fbd3cb93fd04dfaa0aa34d" ON "NftEntity" ("collection_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78b033f14126ecf93afc3c994b" ON "NftEntity" ("collection_alias") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_659d24fe1d8170e3f9d76564a2" ON "NftEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81376f4c43bea45af5d5acaee0" ON "NftEntity" ("createdDate") `,
    );
    await queryRunner.query(
      `ALTER TABLE "NftEntity" RENAME TO "temporary_NftEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "NftEntity" ("id" varchar PRIMARY KEY NOT NULL, "transactionHash" varchar NOT NULL, "transactionTime" integer, "blockHeight" integer NOT NULL, "key" varchar, "label" varchar, "total_copies" integer, "royalty" integer, "royalty_address" varchar, "green" boolean, "storage_fee" integer, "author" varchar, "collection_txid" varchar, "collection_name" varchar, "collection_alias" varchar, "creator_name" varchar, "creator_website" varchar, "creator_written_statement" varchar, "nft_title" varchar, "nft_type" varchar, "nft_series_name" varchar, "nft_creation_video_youtube_url" varchar, "nft_keyword_set" varchar, "preview_hash" varchar, "thumbnail1_hash" varchar, "thumbnail2_hash" varchar, "data_hash" varchar, "original_file_size_in_bytes" integer, "file_type" varchar, "make_publicly_accessible" boolean, "dd_and_fingerprints_ic" integer, "dd_and_fingerprints_max" integer, "dd_and_fingerprints_ids" varchar, "rq_ic" integer, "rq_max" integer, "rq_ids" varchar, "rq_oti" varchar, "status" varchar, "activation_ticket" varchar, "ticketId" varchar, "rawData" varchar NOT NULL, "createdDate" integer NOT NULL, "version" integer, "nsfw_score" integer, "is_likely_dupe" boolean, "is_rare_on_internet" boolean, "preview_thumbnail" varchar, "description" varchar, "pastel_block_hash_when_request_submitted" varchar, "pastel_block_height_when_request_submitted" integer, "utc_timestamp_when_request_submitted" varchar, "pastel_id_of_submitter" varchar, "pastel_id_of_registering_supernode_1" varchar, "pastel_id_of_registering_supernode_2" varchar, "pastel_id_of_registering_supernode_3" varchar, "is_pastel_openapi_request" boolean, "dupe_detection_system_version" varchar, "overall_rareness_score" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_25pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_33pct" integer, "pct_of_top_10_most_similar_with_dupe_prob_above_50pct" integer, "rareness_scores_table_json_compressed_b64" varchar, "open_nsfw_score" integer, "image_fingerprint_of_candidate_image_file" varchar, "hash_of_candidate_image_file" varchar, "collection_name_string" varchar, "open_api_group_id_string" varchar, "group_rareness_score" integer, "candidate_image_thumbnail_webp_as_base64_string" varchar, "does_not_impact_the_following_collection_strings" varchar, "is_invalid_sense_request" varchar, "invalid_sense_request_reason" varchar, "similarity_score_to_first_entry_in_collection" integer, "cp_probability" integer, "child_probability" integer, "image_file_path" varchar, "internet_rareness" varchar, "alternative_nsfw_scores" varchar, "max_permitted_open_nsfw_score" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "NftEntity"("transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score") SELECT "transactionHash", "transactionTime", "blockHeight", "key", "label", "total_copies", "royalty", "royalty_address", "green", "storage_fee", "author", "collection_txid", "collection_name", "collection_alias", "creator_name", "creator_website", "creator_written_statement", "nft_title", "nft_type", "nft_series_name", "nft_creation_video_youtube_url", "nft_keyword_set", "preview_hash", "thumbnail1_hash", "thumbnail2_hash", "data_hash", "original_file_size_in_bytes", "file_type", "make_publicly_accessible", "dd_and_fingerprints_ic", "dd_and_fingerprints_max", "dd_and_fingerprints_ids", "rq_ic", "rq_max", "rq_ids", "rq_oti", "status", "activation_ticket", "ticketId", "rawData", "createdDate", "version", "nsfw_score", "is_likely_dupe", "is_rare_on_internet", "preview_thumbnail", "description", "pastel_block_hash_when_request_submitted", "pastel_block_height_when_request_submitted", "utc_timestamp_when_request_submitted", "pastel_id_of_submitter", "pastel_id_of_registering_supernode_1", "pastel_id_of_registering_supernode_2", "pastel_id_of_registering_supernode_3", "is_pastel_openapi_request", "dupe_detection_system_version", "overall_rareness_score", "pct_of_top_10_most_similar_with_dupe_prob_above_25pct", "pct_of_top_10_most_similar_with_dupe_prob_above_33pct", "pct_of_top_10_most_similar_with_dupe_prob_above_50pct", "rareness_scores_table_json_compressed_b64", "open_nsfw_score", "image_fingerprint_of_candidate_image_file", "hash_of_candidate_image_file", "collection_name_string", "open_api_group_id_string", "group_rareness_score", "candidate_image_thumbnail_webp_as_base64_string", "does_not_impact_the_following_collection_strings", "is_invalid_sense_request", "invalid_sense_request_reason", "similarity_score_to_first_entry_in_collection", "cp_probability", "child_probability", "image_file_path", "internet_rareness", "alternative_nsfw_scores", "max_permitted_open_nsfw_score" FROM "temporary_NftEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_NftEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_3a2a7bc449ad94c8f777d04390" ON "NftEntity" ("preview_thumbnail") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52c53671d80d20b8e991a93406" ON "NftEntity" ("version") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d52605676b9ead33449df8c25" ON "NftEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd6438e69e7a90ee241b3d58ef" ON "NftEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8acf55a80e79f4b1784da5f1a9" ON "NftEntity" ("author") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b55d7eef628b7f23c8d29896c5" ON "NftEntity" ("collection_txid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4169fbd3cb93fd04dfaa0aa34d" ON "NftEntity" ("collection_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78b033f14126ecf93afc3c994b" ON "NftEntity" ("collection_alias") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_659d24fe1d8170e3f9d76564a2" ON "NftEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81376f4c43bea45af5d5acaee0" ON "NftEntity" ("createdDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a235b1a5099e5a40b8c6ec6e1" ON "NftEntity" ("transactionHash") `,
    );
  }
}
