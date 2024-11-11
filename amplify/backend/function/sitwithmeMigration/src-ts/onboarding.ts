import { OnboardingStep } from '@swm-core/interfaces/profile.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_PROFILETABLE_NAME
} = process.env;

/**
 * 1. Scan all Profile items
 * 2. Set onboardingStep = COMPLETE if null
 * 3. Add migratedOnboardingStep flag for rollback
 * 4. Put item with new prop onboardingStep & migratedOnboardingStep
 *
 */
export const updateDefaultProfileOnboardingStep = async (onboardingStepInput) => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all Profile items
      console.log('Scan Items');
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILETABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with onboardingStep = null
        FilterExpression: 'NOT contains(:value, onboardingStep)',
        ExpressionAttributeValues: {
          ':value': Object.values(OnboardingStep),
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Set onboardingStep = COMPLETE if null
      // 3. Add migratedOnboardingStep flag for rollback
      const putItems = Items.map(item => {
        return {
          ...item,
          onboardingStep: onboardingStepInput.onboardingStep,
          migratedOnboardingStep: true,
        }
      });

      // 4. Put item with new prop onboardingStep & migratedOnboardingStep
      await dynamoDBService.batchPut(API_SITWITHME_PROFILETABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}
