/* Amplify Params - DO NOT EDIT
  API_SITWITHME_CONVERSATIONTABLE_ARN
  API_SITWITHME_CONVERSATIONTABLE_NAME
  API_SITWITHME_FOLLOWINGTABLE_ARN
  API_SITWITHME_FOLLOWINGTABLE_NAME
  API_SITWITHME_GRAPHQLAPIENDPOINTOUTPUT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MESSAGETABLE_ARN
  API_SITWITHME_MESSAGETABLE_NAME
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  API_SITWITHME_SUBSCRIPTIONMSGTABLE_ARN
  API_SITWITHME_SUBSCRIPTIONMSGTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

// const mockEvent = {
//   "Records": [
//     {
//       "EventVersion": "1.0",
//       "EventSubscriptionArn": "EXAMPLE",
//       "EventSource": "aws:sns",
//       "Sns": {
//         "SignatureVersion": "1",
//         "Timestamp": "2020-07-02T07:39:32.564Z",
//         "Signature": "EXAMPLE",
//         "SigningCertUrl": "EXAMPLE",
//         "MessageId": "4fea4c01-2d40-402d-beea-a7757df5430b",
//         "Message": "{\"email\":\"abc@gmail.com\"}",
//         "MessageAttributes": {},
//         "Type": "Notification",
//         "UnsubscribeUrl": "EXAMPLE",
//         "TopicArn": "arn:aws:sns:us-east-1:123456789012:WelcomeNewUser",
//         "Subject": ""
//       }
//     }
//   ]
// };

import { NotificationSNSMessage } from '@swm-core/interfaces/push-notification.interface';
import * as resolvers from './notification-handler';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';

const dynamoDb = new DynamoDBService();
const THROTTLE_TABLE_NAME = process.env.THROTTLE_TABLE_NAME || 'NotificationThrottle';
const THROTTLE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const TTL_DURATION = 24 * 60 * 60; // 24 hours in seconds


const isThrottled = async (data: NotificationSNSMessage): Promise<boolean> => {
  const identityId = data?.body?.userId
  if(!identityId) {
    return Promise.resolve(false);
  }

  const key = `${identityId}:${data?.notificationType}`;
  try {
    const result = await dynamoDb.get({
      TableName: THROTTLE_TABLE_NAME,
      Key: { id: key }
    });

    if (result.Item) {
      const lastNotificationTime = parseInt(result.Item.timestamp, 10);
      return Date.now() - lastNotificationTime < THROTTLE_DURATION;
    }
  } catch (error) {
    console.error('Error checking throttle:', error);
  }

  return false;
};

const updateThrottleTimestamp = async (data: NotificationSNSMessage): Promise<void> => {
  const identityId = data?.body?.userId
  if(!identityId) {
    return Promise.resolve();
  }

  const key = `${identityId}:${data?.notificationType}`;

  try {
    await dynamoDb.put({
      TableName: THROTTLE_TABLE_NAME,
      Item: {
        id: key,
        timestamp: Date.now().toString(),
        notificationData: JSON.stringify(data),
        ttl: Math.floor(Date.now() / 1000) + TTL_DURATION // Current time in seconds + 24 hours
      },
    });
  } catch (error) {
    console.error('Error updating throttle timestamp:', error);
  }
};



const recordHandler = async (record: any) => {
  try {
    const message = record?.Sns?.Message;
    if (!message) return;

    const notification = JSON.parse(message) as NotificationSNSMessage;
    const { notificationType, body } = notification;
    let identityId = body?.userId

    if(identityId) {
      try {
        if (await isThrottled(notification)) {
          console.log(`Notification throttled for user ${identityId} and type ${notificationType}`);
          return;
        }
      } catch (error) {
        console.error("Error checking throttle:", error);
      }
    }
    
    const handler = resolvers[notificationType];
    if (handler) {
      await handler(body);
      await updateThrottleTimestamp(notification);
    
    } else {
      console.log('ERROR pushNotification: handler not found.');
    }
  } catch (error) {
    console.error(error);
  }
};

exports.handler = async (event) => {
  console.log('Event :>> ', JSON.stringify(event, null, 2));
  await Promise.all(event.Records.map(recordHandler));
};
