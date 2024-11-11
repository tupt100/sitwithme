import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDBService = new DynamoDBService();

const {
  API_SITWITHME_MAILINGTABLE_NAME,
} = process.env;

export const updateExpiredAtTTLToSecond = async () => {
  let lastEvalKey;
  do {
    try {
      console.log('Scan Items: ', API_SITWITHME_MAILINGTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_MAILINGTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: 'attribute_exists(#expiredAt)',
        ExpressionAttributeNames: {
          '#expiredAt': 'expiredAt'
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const putItems = Items.map(item => {
        return {
          ...item,
          expiredAt: new Date(item.expiredAt).getTime() >= new Date().getTime() ? Math.floor(new Date(item.expiredAt).getTime() / 1000) : item.expiredAt,
        }
      });

      console.log('putItems: ', putItems);
      await dynamoDBService.batchPut(API_SITWITHME_MAILINGTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}