/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_ARN
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_TRANSACTIONHISTORYTABLE_ARN
  API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME
  API_SITWITHME_TRANSACTIONTABLE_ARN
  API_SITWITHME_TRANSACTIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { SQSService } from "@swm-core/services/sqs-service";
import { SubscriptionData } from '@swm-core/interfaces/apple-iap.interface';
import { TransactionService } from '@swm-core/services/transaction.service';

const {
  WEBHOOK_IAP_SUBSCRIPTION_QUEUE_URL
} = process.env;

const sqsService = new SQSService();
const transactionService = new TransactionService();

const recordHandler = async (record) => {
  console.log("Record: ", JSON.stringify(record, null, 2));

  const data: SubscriptionData = JSON.parse(record.body);
  await transactionService.appleIAPSubscription(data);

  // ack sqs message
  await sqsService.deleteMessage({
    QueueUrl: WEBHOOK_IAP_SUBSCRIPTION_QUEUE_URL,
    ReceiptHandle: record.receiptHandle
  });
};

export const handler = async (event) => {
  console.log("event: ", JSON.stringify(event, null, 2));
  let errorMsg;

  for (const record of event.Records) {
    try {
      await recordHandler(record);
    } catch (e) {
      console.log("ERROR: ", e);
      errorMsg = e.errorMsg || "Unknown Error";
    }
  }

  if (errorMsg) {
    throw new Error(errorMsg);
  }
};
