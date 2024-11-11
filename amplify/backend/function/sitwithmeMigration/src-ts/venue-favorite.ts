import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDBService = new DynamoDBService();

const {
  API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
  API_SITWITHME_VENUEFAVORITETABLE_NAME,
  API_SITWITHME_VENUELEADERBOARDTABLE_NAME
} = process.env;

/**
 * 1. Clean venue-leaderboard table data
 * 2. Scan all records in venue favorite table
 * 3. Move records to new table: venue-favorite-v2
 */
export const migrateVenueFavoriteToV2 = async () => {
  let lastEvalKey;

  // 1. Clean venue-leaderboard table data
  do {
    // scan all and call delete api
    let leaderboardRs = await dynamoDBService.scan({
      TableName: API_SITWITHME_VENUELEADERBOARDTABLE_NAME,
      ExclusiveStartKey: lastEvalKey
    });
    lastEvalKey = leaderboardRs.LastEvaluatedKey;
    const itemsDeleted = leaderboardRs.Items.map((item) => {
      return { yelpBusinessID: item.yelpBusinessID };
    });

    // call delete api
    await dynamoDBService.batchDelete(
      API_SITWITHME_VENUELEADERBOARDTABLE_NAME,
      itemsDeleted
    );
    console.log('Delete success', itemsDeleted.length);
  } while (lastEvalKey);

  // 2. Scan all records in venue favorite table
  // and move records to new table: venue-favorite-v2
  lastEvalKey = null;
  do {
    try {
      // 2.0. Scan all venue-favorite items
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_VENUEFAVORITETABLE_NAME,
        ExclusiveStartKey: lastEvalKey
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2.1 move records to new table: venue-favorite-v2
      const putItems = Items.map((item) => {
        return {
          __typename: 'VenueFavoriteV2',
          yelpBusinessID: item.yelpBusinessID,
          venue: item.venue,
          profileID: item.profileID,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
      });
      await dynamoDBService.batchPut(
        API_SITWITHME_VENUEFAVORITEV2TABLE_NAME,
        putItems
      );
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};
