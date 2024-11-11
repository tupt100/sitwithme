import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { WorkplaceService } from '@swm-core/services/workplace.service';

const dynamoDBService = new DynamoDBService();
const workplaceService = new WorkplaceService();
const {
  API_SITWITHME_VENUELEADERBOARDTABLE_NAME
} = process.env;

export const addLocationToVenueLeaderboard = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_VENUELEADERBOARDTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // FilterExpression: 'attribute_not_exists(#venueConnection)',
        // ExpressionAttributeNames: {
        //   '#venueConnection': 'venueConnection'
        // }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const now = new Date().toISOString();
      const putItems = await Promise.all(Items.map(async (item) => {
        const venueFavorite = await workplaceService.getVenueFavoriteByYelpBusinessID(item.yelpBusinessID);
        if (venueFavorite) {
          const location = venueFavorite.venue.location;
          return {
            ...item,
            venueConnection: {
              location,
              geolocation: { lat: location?.latitude, lon: location?.longitude },
            },
            updatedAt: now
          }
        }
        return item;
      }));

      await dynamoDBService.batchPut(API_SITWITHME_VENUELEADERBOARDTABLE_NAME, putItems);
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};