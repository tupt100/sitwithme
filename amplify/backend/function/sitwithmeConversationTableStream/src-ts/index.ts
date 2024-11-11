/* Amplify Params - DO NOT EDIT
	API_SITWITHME_CONVERSATIONTABLE_ARN
  API_SITWITHME_CONVERSATIONTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MESSAGETABLE_ARN
  API_SITWITHME_MESSAGETABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { Conversation, ConversationType } from '@swm-core/interfaces/message.interface';
import { MessageService } from '@swm-core/services/message.service';
import { isArrayChanged } from '@swm-core/utils/comparison.util';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const messageService = new MessageService();

const removeRecordHandler = async (record: any) => {
  const conversation: Conversation = record.old;

  // remove all staff + patrons in broadcast conversation
  if (conversation.conversationType === ConversationType.BROADCAST) {
    await messageService.deleteProfileConversationsByConversationID(conversation.id);

    // remove all messages in this conversation too
    await messageService.deleteMessagesByConversationID(conversation.id);
  }
};

const modifyRecordHandler = async (record: any) => {
  const oldRow = record.old;
  const newRow = record.new;

  const { id, blockedByProfileIDs, hide } = newRow;
  const { blockedByProfileIDs: oldBlockedByProfileIDs } = oldRow;
  if (isArrayChanged(oldBlockedByProfileIDs, blockedByProfileIDs)) {
    await messageService.syncProfileConversationFromConversationTable(id, { blockedByProfileIDs })
  }
  if (oldRow.hide !== hide) {
    await messageService.syncProfileConversationFromConversationTable(id, { hide })
  }
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
          break;
        case 'MODIFY':
          await modifyRecordHandler(record);
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
