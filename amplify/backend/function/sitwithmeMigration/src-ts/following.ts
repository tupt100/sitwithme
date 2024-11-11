import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { Profile } from '@swm-core/interfaces/profile.interface';
import { FollowingService } from '@swm-core/services/following.service';

const dynamoDBService = new DynamoDBService();
const followingService = new FollowingService();
const {
  API_SITWITHME_FOLLOWINGTABLE_NAME
} = process.env;

export const updateDefaultFollowingRequestedBy = async () => {
  let lastEvalKey;
  do {
    try {
      console.log('Scan Items');
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_FOLLOWINGTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with requestedBy = null
        FilterExpression: 'attribute_not_exists(#requestedBy)',
        ExpressionAttributeNames: {
          '#requestedBy': 'requestedBy'
        }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Set requestedBy = patronID if null
      const putItems = Items.map(item => {
        return {
          ...item,
          requestedBy: item.patronID,
        }
      });

      // 4. Put item with new prop requestedBy
      await dynamoDBService.batchPut(API_SITWITHME_FOLLOWINGTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}

const {
  API_SITWITHME_PROFILETABLE_NAME,
} = process.env;

export const addFollowingProfileIDsToProfile = async () => {
  let lastEvalKey;
  do {
    try {
      console.log('Scan Items: ', API_SITWITHME_PROFILETABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Update followingProfileIDs for old records also.
        // FilterExpression: 'attribute_not_exists(#followingProfileIDs)',
        // ExpressionAttributeNames: {
        //   '#followingProfileIDs': 'followingProfileIDs'
        // }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const putItems = [];
      for (const item of Items) {
        const followingProfileIDs = await followingService.listFollowingConfirmedProfileID(item.id, item.role);
        putItems.push({
          ...item,
          followingProfileIDs: followingProfileIDs?.length ? dynamoDBService.dbClient.createSet(followingProfileIDs) as Profile['followingProfileIDs'] : null,
        });
      };

      console.log('putItems: ', putItems);
      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}
