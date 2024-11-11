import { Conversation } from '@swm-core/interfaces/message.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { FollowingService } from '@swm-core/services/following.service';
import { MessageService } from '@swm-core/services/message.service';

const dynamoDBService = new DynamoDBService();
const {
  API_SITWITHME_CONVERSATIONTABLE_NAME
} = process.env;

const messageService = new MessageService();
const followingService = new FollowingService();

export const removeInvalidConversation = async () => {
  let lastEvalKey;
  const tasks: any[] = [];
  do {
    try {
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        FilterExpression: '#conversationType = :conversationType',
        ExpressionAttributeNames: {
          '#conversationType': 'conversationType'
        },
        ExpressionAttributeValues: {
          ':conversationType': 'NORMAL'
        },
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      for (const conversation of Items) {
        const profileCons = await messageService.listProfileConversationsByConversationID(conversation.id);
        if (profileCons.length >= 2) {
          const [ profile1, profile2 ] = profileCons;
          const following1 = await followingService.get(profile1.profileID, profile2.profileID);
          let needRemoved = true;
          if (following1) {
            if (following1.confirmedAt) {
              needRemoved = false;
            }
          } else {
            const following2 = await followingService.get(profile2.profileID, profile1.profileID);
            if (following2?.confirmedAt) {
              needRemoved = false;
            }
          }

          // remove
          if (needRemoved) {
            tasks.push(dynamoDBService.delete({ TableName: API_SITWITHME_CONVERSATIONTABLE_NAME, Key: { id: conversation.id } }));
            tasks.push(messageService.deleteProfileConversationsByConversationID(conversation.id));
            tasks.push(messageService.deleteMessagesByConversationID(conversation.id));
          }
        }
      }

    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);

  while (tasks.length) {
    await Promise.all(tasks.splice(0, 20));
  }

  console.log('DONE');
};