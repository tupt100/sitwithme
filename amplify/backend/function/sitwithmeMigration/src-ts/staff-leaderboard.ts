import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_PROFILETABLE_NAME,
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
} = process.env;

export const initStaffLeaderboard = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: '#role = :role',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':role': 'STAFF'
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const now = new Date().toISOString();
      const putItems = Items.map(item => {
        return {
          staffID: item.id,
          connectionCount: 0,
          __typename: 'StaffLeaderboard',
          gsiHash: 'StaffLeaderboard',
          createdAt: now,
          updatedAt: now
        }
      });

      await dynamoDBService.batchPut(API_SITWITHME_STAFFLEADERBOARDTABLE_NAME, putItems);
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};