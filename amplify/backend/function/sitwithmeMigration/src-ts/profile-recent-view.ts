import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDBService = new DynamoDBService();

const {
  API_SITWITHME_PROFILERECENTVIEWTABLE_NAME,
  API_SITWITHME_PROFILETABLE_NAME,
} = process.env;

export const initProfileRecentView = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const putItems = [];
      for (const item of Items) {
        const values = item.profileRecentView?.values || [];
        if (values.length) {
          for (const v of values) {
            const profileRecentViewID = v.split('#')[0];
            const createdAt = v.split('#')[1];
            putItems.push({
              profileID: item.id,
              profileRecentViewID,
              createdAt
            });
          }
        }
      }

      console.log('putItems: ', putItems);
      await dynamoDBService.batchPut(API_SITWITHME_PROFILERECENTVIEWTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}