import { Conversation, ProfileConversation } from '@swm-core/interfaces/message.interface';
import { UserRole } from '@swm-core/interfaces/profile.interface';
import { DynamoDBService } from '@swm-core/services/dynamodb.service';
import { PhotoService } from '@swm-core/services/photo.service';
import { ProfileService } from '@swm-core/services/profile.service';

const dynamoDBService = new DynamoDBService();
const profileService = new ProfileService();
const photoService = new PhotoService();

const {
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
  API_SITWITHME_MESSAGETABLE_NAME,
  API_SITWITHME_CONVERSATIONTABLE_NAME
} = process.env;

/**
 * 1. Scan all ProfileConversation items
 * 2. Add muteUntil if not existed
 * 3. Put item with new prop muteUntil
 *
 */
export const addMuteUntil = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all ProfileConversation items
      console.log('Scan Items: ', API_SITWITHME_PROFILECONVERSATIONTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with muteUntil is not existed
        FilterExpression: 'attribute_not_exists(muteUntil)',
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      const muteUntil = new Date().toISOString();
      // 2. Add muteUntil if null
      const putItems = Items.map(item => {
        return {
          ...item,
          muteUntil
        }
      });

      console.log('putItems: ', putItems);
      // 4. Put item with new prop muteUntil
      await dynamoDBService.batchPut(API_SITWITHME_PROFILECONVERSATIONTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}

export const addTotalMessage = async () => {
  await Promise.all([
    addTotalMessageToProfileConversation(),
    addTotalMessageToConversation(),
  ])
}

const addTotalMessageToProfileConversation = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all ProfileConversation items
      console.log('Scan Items: ', API_SITWITHME_PROFILECONVERSATIONTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with totalMessage is not existed
        FilterExpression: 'attribute_not_exists(totalMessage)',
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Add totalMessage if null
      const putItems = await Promise.all(Items.map(async (item: ProfileConversation) => {
        const senderProfile = await profileService.get(item.profileID);
        // Currently, client app can get avatar from conversation -> profileConversations
        // const recipientProfile = await profileService.getProfileByUserID(item.recipientUserID, senderProfile.role === UserRole.PATRON ? UserRole.STAFF : UserRole.PATRON);
        // const recipientProfileAvatar = recipientProfile.avatarID ? await photoService.get(recipientProfile.avatarID) : null;

        const { Items } = await dynamoDBService.query({
          TableName: API_SITWITHME_MESSAGETABLE_NAME,
          IndexName: 'byConversationIDSortByCreatedAt',
          KeyConditionExpression: '#conversationID = :conversationID',
          ExpressionAttributeNames: {
            '#conversationID': 'conversationID',
          },
          ExpressionAttributeValues: {
            ':conversationID': item.conversationID,
          }
        });
        return {
          ...item,
          totalMessage: Items.length,
          // Currently, client app can get avatar from conversation -> profileConversations
          // recipientConnection: {
          //   ...item.recipientConnection,
          //   avatarUrl: recipientProfileAvatar?.url || null,
          // }
        }
      }));

      console.log('putItems: ', putItems);
      // 4. Put item with new prop totalMessage and avatarUrl
      await dynamoDBService.batchPut(API_SITWITHME_PROFILECONVERSATIONTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}

const addTotalMessageToConversation = async () => {
  let lastEvalKey;
  do {
    try {
      // 1. Scan all Conversation items
      console.log('Scan Items: ', API_SITWITHME_CONVERSATIONTABLE_NAME);
      const { Items, LastEvaluatedKey } = await dynamoDBService.scan({
        TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
        ExclusiveStartKey: lastEvalKey,
        // Find all records with totalMessage is not existed
        FilterExpression: 'attribute_not_exists(totalMessage)',
      });
      lastEvalKey = LastEvaluatedKey;
      console.log('Scanned Items: ', Items);

      // 2. Add totalMessage if null
      const putItems = await Promise.all(Items.map(async (item: Conversation) => {
        const { Items } = await dynamoDBService.query({
          TableName: API_SITWITHME_MESSAGETABLE_NAME,
          IndexName: 'byConversationIDSortByCreatedAt',
          KeyConditionExpression: '#conversationID = :conversationID',
          ExpressionAttributeNames: {
            '#conversationID': 'conversationID',
          },
          ExpressionAttributeValues: {
            ':conversationID': item.id,
          }
        });
        return {
          ...item,
          totalMessage: Items.length
        }
      }));

      console.log('putItems: ', putItems);
      // 4. Put item with new prop totalMessage
      await dynamoDBService.batchPut(API_SITWITHME_CONVERSATIONTABLE_NAME, putItems);
    } catch (e) {
      console.log('ERROR: ', e);
    }
  } while (lastEvalKey);
}