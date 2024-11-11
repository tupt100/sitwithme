/* Amplify Params - DO NOT EDIT
	API_SITWITHME_GRAPHQLAPIIDOUTPUT
	API_SITWITHME_PRESENCETABLE_ARN
	API_SITWITHME_PRESENCETABLE_NAME
	API_SITWITHME_PROFILETABLE_ARN
	API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { PlatformException } from "@swm-core/exceptions/platform.exception";
import { PresenceService } from "@swm-core/services/presence.service";
import { SQSService } from "@swm-core/services/sqs-service";

const {
  DISCONNECT_QUEUE_URL
} = process.env;

const sqsService = new SQSService();
const presenceService = new PresenceService();

const recordHandler = async (record) => {
  console.log("Record: ", JSON.stringify(record, null, 2));
  /**
   * data format:
    {
      "clientId": "dev:134c019e-51fb-4d0e-a589-0a2b7079518e:abcc019e-5bcb-4d0e-efg4-0a2b707abc18e",
      "timestamp": 1630137279976,
      "eventType": "connected", // disconnected
      "sessionIdentifier": "295e0278-189f-4d8b-b3b9-2de0b8c9b103",
      "principalIdentifier": "AROA5UWZZWVI7DBQNWIPB:CognitoIdentityCredentials",
      "ipAddress": "117.3.39.237",
      "versionNumber": 0
    }
   */
  const data = JSON.parse(record.body);
  const { eventType, clientId } = data;
  if (eventType === 'disconnected') {
    try {
      await presenceService.disconnect(clientId, 5000);
    } catch (e) {
      if (e instanceof PlatformException) {
        console.log('client ID is invalid, ignore.');
      }
    }
  }

  // ack sqs message
  await sqsService.deleteMessage({
    QueueUrl: DISCONNECT_QUEUE_URL,
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
