import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { TransactionService } from '@swm-core/services/transaction.service';

const dynamoDBService = new DynamoDBService();
const transactionService = new TransactionService();

const {
  API_SITWITHME_TRANSACTIONTABLE_NAME
} = process.env;

/**
 * 1. Scan all transaction items
 * 2. Put receipt to s3
 * 3. Remove receipt and receipt info
 *
 */
export const removeReceiptInTransaction = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all transaction items
      console.log('Scan Items: ', API_SITWITHME_TRANSACTIONTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_TRANSACTIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with receipt != null
        FilterExpression: 'attribute_exists(#receipt) AND #receipt <> :null',
        ExpressionAttributeNames: {
          '#receipt': 'receipt'
        },
        ExpressionAttributeValues: {
          ':null': null,
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 3. Remove receipt and receipt info
      const putItems = [];
      for (const item of Items) {
        await transactionService.saveReceiptToS3(item.id, item.receipt);
        const { receipt, ...removedReceiptItem } = item;
        putItems.push(removedReceiptItem);
      };

      console.log('putItems: ', putItems);

      await dynamoDBService.batchPut(API_SITWITHME_TRANSACTIONTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}
