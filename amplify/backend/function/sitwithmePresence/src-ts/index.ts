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

import { PresenceService } from "@swm-core/services/presence.service";
import { SQSService } from "@swm-core/services/sqs-service";

const {
  DISCONNECT_QUEUE_URL
} = process.env;

const presenceService = new PresenceService();
const sqsService = new SQSService();

/**
	event format
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
export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
	const { eventType, clientId, timestamp } = event;
	switch(eventType) {
		case 'connected': {
			await presenceService.connect(clientId, new Date(timestamp));
			break;
		}
		case 'disconnected': {
			await sqsService.sendMessage({
				MessageBody: JSON.stringify(event),
				QueueUrl: DISCONNECT_QUEUE_URL,
				DelaySeconds: 5
			});
			break;
		}
		default: {
			console.log(`WARNING: not support this event ${eventType}`);
			break;
		}
	}
};
