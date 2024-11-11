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
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

// import { PresenceService } from "@swm-core/services/presence.service";
import { SQSBroadcastEventType } from "@swm-core/interfaces/message.interface";
import { MessageService } from "@swm-core/services/message.service";
import { SQSService } from "@swm-core/services/sqs-service";

const {
  BROADCAST_QUEUE_URL
} = process.env;

const sqsService = new SQSService();
const messageService = new MessageService();

const recordHandler = async (record) => {
  console.log("Record: ", JSON.stringify(record, null, 2));
  /**
   * data format:
    {
      "eventType": 1,
      "conversation": Conversation,
      "patronConversation": ProfileConversation,
      "message": Message
    }
   */
  const data = JSON.parse(record.body);
  switch (data.eventType) {
    case SQSBroadcastEventType.INIT_BROADCAST: {
      // staff send 1-1 conversation message to patrons
      await messageService.initConversationsFromBroadcast(data.conversation);
      break;
    }

    case SQSBroadcastEventType.SEND_BROADCAST_MESSAGE: {
      // sync message to private conversation
      await messageService.syncMessageFromBroadcast(data.conversation.id, data.message);
      break;
    }

    case SQSBroadcastEventType.PATRON_ADDED: {
      // Create 1-1 staff with this patron if not exists
      // and sync old messages to 1-1 conversation via SQS
      await messageService.syncNewPatronConversationMessage(data.conversation, data.patronConversation);
      break;
    }

    default:
      break;
  }

  // ack sqs message
  await sqsService.deleteMessage({
    QueueUrl: BROADCAST_QUEUE_URL,
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
