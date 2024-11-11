import { PostType } from '@swm-core/interfaces/post.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_POSTTABLE_NAME
} = process.env;

export const initPostType = async () => {
  let lastEvalKey;
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_POSTTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: 'attribute_not_exists(#postType)',
        ExpressionAttributeNames: {
          '#postType': 'postType'
        }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const now = new Date().toISOString();
      const putItems = Items.map(item => {
        return {
          ...item,
          postType: PostType.PHOTO,
          updatedAt: now
        }
      });

      await dynamoDBService.batchPut(API_SITWITHME_POSTTABLE_NAME, putItems);
      console.log('DONE');
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
};
