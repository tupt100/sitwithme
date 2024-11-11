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
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import { Conversation, ConversationType, ProfileConversation } from '@swm-core/interfaces/message.interface';
import { MessageService } from '@swm-core/services/message.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const messageService = new MessageService();

const removeRecordHandler = async (record: any) => {
  const profileConversation: ProfileConversation = record.old;

  // remove all messages in broadcast conversation
  if (profileConversation.conversationType === ConversationType.BROADCAST) {
    const messages = await messageService.allMessagesBySentFromConversationID(profileConversation.conversationID);
    await messageService.deleteMessages(messages.map(m => m.id));

    // if this patron is the last member of this broadcast, then delete this broadcast
    const conversation = await messageService.getConversation(profileConversation.conversationID);
    if (conversation) {
      const patronProfiles = await messageService.listPatronsByBroadcastConversationID(conversation.creatorProfileID, conversation.id);
      if (!patronProfiles.length) {
        // delete broadcast
        await messageService.deleteConversation(conversation.id);
      }
    }
  }
};

const modifyRecordHandler = async (record: any) => {
  const oldRow = record.old;
  const newRow = record.new;

  const { conversationID, blockedByProfileID, profileID, hide } = newRow;
  if (oldRow.blockedByProfileID !== blockedByProfileID) {
    await messageService.notifyProfileConversationUpdated({
      recipientProfileID: profileID,
      conversationID: conversationID,
      block: !!blockedByProfileID,
      blockedByProfileID: blockedByProfileID || oldRow.blockedByProfileID
    })
  }

  if (oldRow.hide !== hide) {
    await messageService.notifyProfileConversationUpdated({
      recipientProfileID: profileID,
      conversationID: conversationID,
      hide
    })
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
