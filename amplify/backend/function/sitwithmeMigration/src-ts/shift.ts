import { Shift } from '@swm-core/interfaces/shift.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_SHIFTTABLE_NAME
} = process.env;

/**
 * 1. Scan all Shift items
 * 2. Set geolocation = location if null
 * 3. Add migratedGeolocation flag for rollback
 * 4. Put item with new prop geolocation & migratedGeolocation
 *
 */
export const addShiftGeolocation = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all Shift items
      console.log('Scan Items: ', API_SITWITHME_SHIFTTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_SHIFTTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with geolocation = null
        FilterExpression: 'attribute_not_exists(workplaceConnection.geolocation) or workplaceConnection.geolocation = :null',
        ExpressionAttributeValues: {
          ':null': null,
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Set geolocation = location if null
      // 3. Add migratedGeolocation flag for rollback
      const putItems = Items.map((item: Partial<Shift>) => {
        return {
          ...item,
          workplaceConnection: {
            ...item.workplaceConnection,
            geolocation: {
              lat: item.workplaceConnection.location.latitude,
              lon: item.workplaceConnection.location.longitude,
            },
          },
          migratedGeolocation: true,
        }
      });

      // 4. Put item with new prop geolocation & migratedGeolocation
      await dynamoDBService.batchPut(API_SITWITHME_SHIFTTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}

export const syncShiftToExploreProfile = async () => {
  let lastEvalKey;
  do {
    try {
      console.log('Scan Items: ', API_SITWITHME_SHIFTTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_SHIFTTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      await dynamoDBService.batchPut(API_SITWITHME_SHIFTTABLE_NAME, Items);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};

export const migrateShiftAlert = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_SHIFTTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
      });
      lastEvalKey = LastEvaluatedKey;

      const putItems = Items.map((item: Shift) => {
        const startDate = new Date(item.start);
        startDate.setMilliseconds(startDate.getMilliseconds() + 1);
        const endDate = new Date(item.end);
        endDate.setMilliseconds(endDate.getMilliseconds() + 1);

        return {
          ...item,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }
      });

      await dynamoDBService.batchPut(API_SITWITHME_SHIFTTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}