/* Amplify Params - DO NOT EDIT
	API_SITWITHME_CONVERSATIONTABLE_ARN
  API_SITWITHME_CONVERSATIONTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MESSAGETABLE_ARN
  API_SITWITHME_MESSAGETABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME

	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { Message } from '@swm-core/interfaces/message.interface';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { MessageService } from '@swm-core/services/message.service';
import { NotificationService } from '@swm-core/services/notification.service';
import { SNSService } from '@swm-core/services/sns-service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const {
  PUSH_NOTIFICATION_TOPIC_ARN
} = process.env;

const messageService = new MessageService();
const snsService = new SNSService();
const notificationService = new NotificationService();

const insertRecordHandler = async (record: any) => {
  const message: Message = record.new;

  try {
    await messageService.syncConversationFromMessage(message);
  } catch (e) {
    // silent error, no need to retry if have race condition
    console.log('ERROR when syncConversationFromMessage: ', e);
  }

  const profileConversations = await messageService.listProfileConversationsByConversationID(message.conversationID);

  // send notification
  const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.SEND_MESSAGE, body: message };
  await snsService.publish({
    Message: JSON.stringify(notificationSNSMessage),
    TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
  });

  // save notification
  const tasks: Promise<any>[] = [];
  for (const profileConversation of profileConversations) {
    const recipientProfileID = profileConversation.profileID;
    // Does not save notification for ignored message conversation
    if (recipientProfileID !== message.senderProfileID && !profileConversation.ignore) {
      const notif = await notificationService.getDirectMessageNotif(message.senderProfileID, recipientProfileID);
      if (notif) {
        // update time to push notif on top
        tasks.push(notificationService.updateDirectMessageNotifTime(notif.id, new Date(message.createdAt)));
      } else {
        // create a new notif
        tasks.push(notificationService.createDirectMessageNotif({
          senderProfileID: message.senderProfileID,
          recipientProfileID,
          conversationID: message.conversationID
        }));
      }
    }
  }
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
};

const removeRecordHandler = async (record: any) => {
  const message: Message = record.old;

  // reduce total message
  await messageService.syncConversationFromMessageDeleted(message);
};

export const handler = async (event) => {
  console.info('Event: ', JSON.stringify(event, null, 2));
  const errors = [];

  const records = event.Records.map(record => ({
    eventName: record.eventName,
    new: DynamoDB.Converter.unmarshall(record.dynamodb.NewImage),
    old: DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
  }));

  console.info('records: ', JSON.stringify(records, null, 2));

  for (const record of records) {
    try {
      switch (record.eventName) {
        case 'INSERT':
          await insertRecordHandler(record);
          break;
        case 'MODIFY':
          break;
        case 'REMOVE':
          await removeRecordHandler(record);
          break;

        default:
          console.log(`Unexpect record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
