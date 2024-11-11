import { Workplace } from '@swm-core/interfaces/workplace.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { WorkplaceService } from '@swm-core/services/workplace.service';

const dynamoDBService = new DynamoDBService();
const workplaceService = new WorkplaceService();
const {
  API_SITWITHME_WORKPLACETABLE_NAME
} = process.env;

/**
 * 1. Scan all Workplace items
 * 2. Add yelpCategories if null
 * 3. Put item with new prop yelpCategories
 *
 */
export const addYelpCategories = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all Workplace items
      console.log('Scan Items: ', API_SITWITHME_WORKPLACETABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_WORKPLACETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with yelpCategories = null
        FilterExpression: 'attribute_not_exists(yelpCategories) or yelpCategories = :null',
        ExpressionAttributeValues: {
          ':null': null,
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Add yelpCategories if null
      const putItems = [];
      for (const item of Items) {
        const yelpBusiness = await workplaceService.getYelpBusiness(item.yelpBusinessID, false);
        putItems.push({
          ...item,
          yelpCategories: yelpBusiness.yelpCategories
        });
        // Sleep 0.5s to avoid yelp block sending request
        await new Promise(r => setTimeout(r, 500));
      };

      console.log('putItems: ', putItems);
      // 4. Put item with new prop yelpCategories
      await dynamoDBService.batchPut(API_SITWITHME_WORKPLACETABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}
