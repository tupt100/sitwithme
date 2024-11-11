import { User } from '@swm-core/interfaces/user.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { getMonthAndDayFromDate } from '@swm-core/utils/date.util';

const dynamoDBService = new DynamoDBService();

const {
  API_SITWITHME_USERTABLE_NAME
} = process.env;

export const updateBirthdayIndex = async () => {
  let lastEvalKey;
  do {
    try {
      console.log('Scan Items');
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_USERTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with birthdayIndex = null
        FilterExpression: 'attribute_not_exists(#birthdayIndex) AND (attribute_exists(#birthday) AND #birthday <> :null)',
        ExpressionAttributeNames: {
          '#birthdayIndex': 'birthdayIndex',
          '#birthday': 'birthday'
        },
        ExpressionAttributeValues: {
          ':null': null
        }
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const putItems = Items.map((item: User) => {
        return {
          ...item,
          birthdayIndex: getMonthAndDayFromDate(item.birthday),
        }
      });

      await dynamoDBService.batchPut(API_SITWITHME_USERTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}
