import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, ConversationType, CreateConversationInput, CreateMessageInput, CreateProfileConversationInput, Message, MessageDetail, MessageReaction, MessageType, ProfileConversation, ProfileConversationUpdated, SQSBroadcastEventType, SQSBroadcastGroupID, SyncProfileConversationInput, UpdateBroadcastConversationInput, UpdateConversationInput, UpdateProfileConversationInput } from '@swm-core/interfaces/message.interface';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDBService } from './dynamodb.service';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { UserService } from './user.service';
import { User } from '@swm-core/interfaces/user.interface';
import { PatronProfile, Profile, StaffProfile, UserRole } from '@swm-core/interfaces/profile.interface';
import { getFileUrlFromS3 } from '@swm-core/utils/file.util';
import { SQSService } from './sqs-service';
import { ProfileService } from './profile.service';
import { hasAttr } from '@swm-core/utils/validation.util';
import { removeUndefined } from '@swm-core/utils/normalization.util';
import { FollowingService } from './following.service';
import { NotificationSNSMessage, NotificationType, NotifyMessageReactionInput } from '@swm-core/interfaces/push-notification.interface';
import { SNSService } from './sns-service';

const {
  API_SITWITHME_CONVERSATIONTABLE_NAME,
  API_SITWITHME_MESSAGETABLE_NAME,
  API_SITWITHME_MESSAGEREACTIONTABLE_NAME,
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
  PUSH_NOTIFICATION_TOPIC_ARN,
  ASSET_BASE_URL,
  BROADCAST_QUEUE_URL
} = process.env;

const dynamoDBService = new DynamoDBService();
const userService = new UserService();
// const photoService = new PhotoService();
const sqsService = new SQSService();
const profileService = new ProfileService();
const followingService = new FollowingService();
const snsService = new SNSService();

export class MessageService {
  async getConversation(id: string): Promise<Conversation> {
    return <Conversation>(await dynamoDBService.get({
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      Key: { id },
    })).Item;
  }

  async deleteConversation(id: string) {
    const params = {
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      Key: { id }
    };
    await dynamoDBService.delete(params);
  }

  async deleteConversations(IDs: string[]) {
    await dynamoDBService.batchDelete(API_SITWITHME_CONVERSATIONTABLE_NAME, IDs.map(_id => ({ id: _id })));
  }

  async deleteMessageReactions(keys: any[]) {
    return dynamoDBService.batchDelete(
      API_SITWITHME_MESSAGEREACTIONTABLE_NAME,
      keys.map(k => ({ messageID: k.messageID, 'profileID#messageReactionType': `${k.profileID}#${k.messageReactionType}` }))
    );
  }

  async updateBroadcastConversation(id: string, input: UpdateBroadcastConversationInput): Promise<Conversation> {
    this.validateUpdateBroadcastConversation(input);

    removeUndefined(input);

    const conversationParams = { ...input };
    const params = {
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': conversationParams }),
      ReturnValues: "ALL_NEW"
    };
    const result = await dynamoDBService.update(params);
    return result.Attributes as Conversation;
  }

  async allUnreadProfileConversations(profileID: string): Promise<ProfileConversation[]> {
    let rs: ProfileConversation[] = [];
    let lastEvalKey: any;
    do {
      const params: DocumentClient.QueryInput = {
        TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
        KeyConditionExpression: '#profileID = :profileID',
        FilterExpression: '#conversationType = :conversationType',
        ExpressionAttributeNames: {
          '#profileID': 'profileID',
          '#conversationType': 'conversationType'
        },
        ExpressionAttributeValues: {
          ':profileID': profileID,
          ':conversationType': ConversationType.NORMAL
        },
        ExclusiveStartKey: lastEvalKey
      };
      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      if (result.Items.length > 0) {
        result.Items.forEach((item: ProfileConversation) => {
          if (!item.read && !item.ignore && !item.hide) {
            // If conversation already deleted, so we only check read after have at least a message coming after deleted
            if (item.deletedAt && item.lastMessageAt) {
              if (new Date(item.deletedAt).getTime() < new Date(item.lastMessageAt).getTime()) {
                rs.push(item);
              }
            } else {
              rs.push(item);
            }
          }
        });
      }
    } while (lastEvalKey);
    return rs;
  }

  async allProfileNormalConversations(profileID: string): Promise<ProfileConversation[]> {
    let rs: ProfileConversation[] = [];
    let lastEvalKey: any;
    do {
      const params: DocumentClient.QueryInput = {
        TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
        KeyConditionExpression: '#profileID = :profileID',
        FilterExpression: '#conversationType = :conversationType',
        ExpressionAttributeNames: {
          '#profileID': 'profileID',
          '#conversationType': 'conversationType',
        },
        ExpressionAttributeValues: {
          ':profileID': profileID,
          ':conversationType': ConversationType.NORMAL
        },
        ExclusiveStartKey: lastEvalKey
      };
      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      if (result.Items.length > 0) {
        result.Items.forEach((item: ProfileConversation) => {
          rs.push(item);
        });
      }
    } while (lastEvalKey);
    return rs;
  }

  async getProfileConversation(profileID: string, conversationID: string, conversationType: ConversationType): Promise<ProfileConversation> {
    const params = {
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      KeyConditionExpression: '#profileID = :profileID AND #conversationID = :conversationID',
      FilterExpression: '#conversationType = :conversationType',
      ExpressionAttributeNames: {
        '#conversationID': 'conversationID',
        '#profileID': 'profileID',
        '#conversationType': 'conversationType'
      },
      ExpressionAttributeValues: {
        ':conversationID': conversationID,
        ':profileID': profileID,
        ':conversationType': conversationType
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items[0] as ProfileConversation;
    }
  }

  async listProfileConversationsByConversationID(conversationID: string): Promise<ProfileConversation[]> {
    const params = {
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      IndexName: 'byConversationIDSortByProfileID',
      KeyConditionExpression: '#conversationID = :conversationID',
      ExpressionAttributeNames: {
        '#conversationID': 'conversationID'
      },
      ExpressionAttributeValues: {
        ':conversationID': conversationID
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as ProfileConversation[];
    }
    return [];
  }

  async listProfileConversationsByParticipants(profileID1: string, profileID2: string): Promise<ProfileConversation[]> {
    const conversationID = await this.getConversationIDByParticipants(profileID1, profileID2);
    if (!conversationID) {
      return [];
    }
    return await this.listProfileConversationsByConversationID(conversationID);
  }

  async syncMessageFromBroadcast(conversationID: string, message: Message) {
    const conversations = await this.listConversationsByBroadcastConversationID(conversationID);
    await this.syncMessageToConversations(message, conversations.filter(c => !c.blockedByProfileID).map(c => c.id), conversationID);
  }

  async listConversationsByBroadcastConversationID(conversationID: string): Promise<Conversation[]> {
    const { Items } = await dynamoDBService.query({
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      IndexName: 'byParentConversationID',
      KeyConditionExpression: '#parentConversationID = :parentConversationID',
      ExpressionAttributeNames: {
        '#parentConversationID': 'parentConversationID'
      },
      ExpressionAttributeValues: {
        ':parentConversationID': conversationID
      }
    });

    return Items as Conversation[];
  }

  async listPatronsByBroadcastConversationID(creatorProfileID: string, conversationID: string, sort: boolean = false): Promise<PatronProfile[]> {
    // validate broadcast conversation
    await this.validateBroadcastConversation(creatorProfileID, conversationID);

    // list conversation patrons
    const { Items } = await dynamoDBService.query({
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      IndexName: 'byConversationIDSortByProfileID',
      KeyConditionExpression: '#conversationID = :conversationID',
      ExpressionAttributeNames: {
        '#conversationID': 'conversationID'
      },
      ExpressionAttributeValues: {
        ':conversationID': conversationID
      }
    });
    const patronIDs = Items.filter((pc) => pc.profileID !== creatorProfileID).map(pc => pc.profileID);
    if (!patronIDs.length) {
      return [];
    }

    const patrons = await profileService.batchGet(patronIDs);

    // sort
    if (sort) {
      const rs: PatronProfile[] = [];
      const users = await userService.batchGet(patrons.map(p => p.userID));
      users.sort((a, b) => {
        if (a.firstName === b.firstName) {
          return (a.lastName < b.lastName) ? -1 : 1;
        }

        return (a.firstName < b.firstName) ? -1 : 1;
      });

      users.forEach(u => {
        const profile = patrons.find(p => p.userID === u.id);
        if (profile) {
          rs.push(profile);
        }
      });

      return rs;
    }

    return patrons;
  }

  async listProfileConversationsInConversationIDs(profileID: string, conversationIDs: string[]): Promise<ProfileConversation[]> {
    const params = {
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      const items = result.Items as ProfileConversation[];
      return items.filter(item => conversationIDs.includes(item.conversationID) );
    }
    return [];
  }

  async listMessagesByConversationID(conversationID: string, limit?: number, from?: Date, scanIndexForward: boolean = true): Promise<Message[]> {
    const params: DocumentClient.QueryInput = {
      TableName: API_SITWITHME_MESSAGETABLE_NAME,
      IndexName: 'byConversationIDSortByCreatedAt',
      KeyConditionExpression: '#conversationID = :conversationID',
      ExpressionAttributeNames: {
        '#conversationID': 'conversationID'
      },
      ExpressionAttributeValues: {
        ':conversationID': conversationID
      },
      ScanIndexForward: scanIndexForward
    };

    if (limit) {
      params.Limit = limit;
    }

    if (from) {
      params.KeyConditionExpression += ` AND #createdAt >= :createdAt`;
      params.ExpressionAttributeNames['#createdAt'] = 'createdAt';
      params.ExpressionAttributeValues[':createdAt'] = from.toISOString();
    }

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as Message[];
    }
    return [];
  }

  async allMessagesByProfileIDAndConversationID(senderProfileID: string, conversationID: string) {
    const rs: Message[] = [];
    let lastEvalKey;
    do {
      const params: DocumentClient.QueryInput = {
        TableName: API_SITWITHME_MESSAGETABLE_NAME,
        IndexName: 'bySenderProfileIDSoryByConversationID',
        KeyConditionExpression: '#senderProfileID = :senderProfileID AND #conversationID = :conversationID',
        ExpressionAttributeNames: {
          '#senderProfileID': 'senderProfileID',
          '#conversationID': 'conversationID'
        },
        ExpressionAttributeValues: {
          ':senderProfileID': senderProfileID,
          ':conversationID': conversationID
        },
        ExclusiveStartKey: lastEvalKey
      };

      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      result.Items.forEach((item: Message) => {
        rs.push(item);
      });
    } while (lastEvalKey);

    return rs;
  }

  async allMessagesBySentFromConversationID(conversationID: string): Promise<Message[]> {
    const rs: Message[] = [];
    let lastEvalKey;
    do {
      const params: DocumentClient.QueryInput = {
        TableName: API_SITWITHME_MESSAGETABLE_NAME,
        IndexName: 'bySentFromConversationID',
        KeyConditionExpression: '#sentFromConversationID = :sentFromConversationID',
        ExpressionAttributeNames: {
          '#sentFromConversationID': 'sentFromConversationID'
        },
        ExpressionAttributeValues: {
          ':sentFromConversationID': conversationID
        },
        ExclusiveStartKey: lastEvalKey
      };

      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      result.Items.forEach((item: Message) => {
        rs.push(item);
      });
    } while (lastEvalKey);

    return rs;
  }

  async allMessagesByConversationID(conversationID: string): Promise<Message[]> {
    const rs: Message[] = [];
    let lastEvalKey;
    do {
      const params: DocumentClient.QueryInput = {
        TableName: API_SITWITHME_MESSAGETABLE_NAME,
        IndexName: 'byConversationIDSortByCreatedAt',
        KeyConditionExpression: '#conversationID = :conversationID',
        ExpressionAttributeNames: {
          '#conversationID': 'conversationID'
        },
        ExpressionAttributeValues: {
          ':conversationID': conversationID
        },
        ExclusiveStartKey: lastEvalKey
      };

      const result = await dynamoDBService.query(params);
      lastEvalKey = result.LastEvaluatedKey;

      result.Items.forEach((item: Message) => {
        rs.push(item);
      });
    } while (lastEvalKey);

    return rs;
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      ...input,
      id: uuidv4(),
      __typename: 'Conversation',
      totalMessage: 0,
      createdAt: now
    };
    const params = {
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      Item: conversation
    };
    await dynamoDBService.put(params);
    return conversation;
  }

  async createProfileConversation(input: CreateProfileConversationInput): Promise<ProfileConversation> {
    const now = new Date().toISOString();
    const profileConversation: ProfileConversation = {
      ...input,
      __typename: 'ProfileConversation',
      muteUntil: now,
      read: true,
      totalMessage: 0,
      createdAt: now,
    };
    const params = {
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      Item: profileConversation
    };
    await dynamoDBService.put(params);
    return profileConversation;
  }

  async initConversationsFromBroadcast(broadcastConversation: Conversation) {
    const senderProfileID = broadcastConversation.creatorProfileID;
    const senderProfile = await profileService.get(senderProfileID);
    const sender = await userService.get(senderProfile.userID);

    // Create new 1-1 conversations between staff and patron
    const profileConversations = await this.listProfileConversationsByConversationID(broadcastConversation.id);

    const tasks: Promise<any>[] = [];
    const recipientProfilesTasks: Promise<Profile>[] = [];
    for (const pc of profileConversations) {
      if (pc.profileID !== senderProfileID) {
        recipientProfilesTasks.push(profileService.get(pc.profileID));
      }
    }
    const recipientProfiles = await Promise.all(recipientProfilesTasks);

    for (const recipientProfile of recipientProfiles) {
      // Create 1-1 conversation if doesn't exist
      let conversation = await this.getConversationByParticipants(senderProfileID, recipientProfile.id);
      if (!conversation) {
        conversation = await this.createConversation({
          conversationType: ConversationType.NORMAL,
          creatorProfileID: senderProfileID,
          parentConversationID: broadcastConversation.id
        });
      } else {
        await this.updateConversation(conversation.id, { parentConversationID: broadcastConversation.id });
        continue;
      }

      const recipient = await userService.get(recipientProfile.userID);

      // Staff Sender
      tasks.push(this.createProfileConversation({
        conversationID: conversation.id,
        conversationType: conversation.conversationType,
        profileID: senderProfileID,
        recipientConnection: {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          userName: recipient.userName
        },
        recipientUserID: recipient.id
      }));

      // Patron Recipient
      tasks.push(this.createProfileConversation({
        conversationID: conversation.id,
        conversationType: conversation.conversationType,
        profileID: recipientProfile.id,
        recipientConnection: {
          firstName: sender.firstName,
          lastName: sender.lastName,
          userName: sender.userName
        },
        recipientUserID: sender.id
      }));
    }

    while (tasks.length) {
      await Promise.all(tasks.splice(0, 20));
    }
  }

  /**
   * Init a conversation for 2 participants:
   *
   * 1. Create a new conversation
   * 2. Create 2 profile conversations
   *
   * @param senderProfileID
   * @param recipientProfileID
   * @param creatorProfileID
   * @returns
   */
  async initConversation(senderProfile: Profile, recipientProfile: Profile): Promise<Conversation> {
    // validate first
    let sender: User;
    let recipient: User;

    if (senderProfile.role === recipientProfile.role) {
      throw new BadRequestException("Only Staff/Patron can send message together");
    }

    try {
      sender = await userService.get(senderProfile.userID);
      if (!sender) {
        throw new BadRequestException("Sender not found");
      }
    } catch (e) {
      throw new BadRequestException("Sender not found");
    }

    try {
      recipient = await userService.get(recipientProfile.userID);
      if (!recipient) {
        throw new BadRequestException("Recipient not found");
      }
    } catch (e) {
      throw new BadRequestException("Recipient not found");
    }

    if (sender.id === recipient.id) {
      throw new BadRequestException("You can't send message to yourself");
    }

    // 1. Create a new conversation
    const conversation = await this.createConversation({
      conversationType: ConversationType.NORMAL,
      creatorProfileID: senderProfile.id
    });

    // 2. Create 2 profile conversations
    // Currently, client app can get avatar from conversation -> profileConversations
    await Promise.all([
      this.createProfileConversation({
        conversationID: conversation.id,
        conversationType: conversation.conversationType,
        recipientConnection: {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          userName: recipient.userName,
        },
        recipientUserID: recipient.id,
        profileID: senderProfile.id,
      }),
      this.createProfileConversation({
        conversationID: conversation.id,
        conversationType: conversation.conversationType,
        profileID: recipientProfile.id,
        recipientConnection: {
          firstName: sender.firstName,
          lastName: sender.lastName,
          userName: sender.userName,
        },
        recipientUserID: sender.id,
      })
    ]);

    return conversation;
  }

  async initBroadcastConversation(senderProfile: StaffProfile, recipientProfiles: PatronProfile[], broadcastName: string): Promise<Conversation> {
    let sender: User;
    try {
      sender = await userService.get(senderProfile.userID);
      if (!sender) {
        throw new BadRequestException("Sender not found");
      }
    } catch (e) {
      throw new BadRequestException("Sender not found");
    }

    // 1. Create a new broadcast conversation
    const broadcastConversation = await this.createConversation({
      conversationType: ConversationType.BROADCAST,
      creatorProfileID: senderProfile.id,
      broadcastName
    });

    // 2. All profiles join to conversations
    const tasks: Promise<any>[] = [];

    // 2.1 Sender join broadcastConversation
    tasks.push(this.createProfileConversation({
      conversationID: broadcastConversation.id,
      conversationType: broadcastConversation.conversationType,
      broadcastName: broadcastName,
      profileID: senderProfile.id
    }));

    // 2.2 recipientProfiles join broadcastConversation
    for (const recipientProfile of recipientProfiles) {
      tasks.push(this.createProfileConversation({
        conversationID: broadcastConversation.id,
        conversationType: broadcastConversation.conversationType,
        broadcastName: broadcastName,
        profileID: recipientProfile.id
      }));
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }

    return broadcastConversation;
  }

  validateMessageDetail(messageDetail: MessageDetail): string {
    let errorMsg: string;
    if (messageDetail.messageType === MessageType.TEXT && !messageDetail.text) {
      errorMsg = 'message text is required';
    } else if (messageDetail.messageType === MessageType.FILE && !messageDetail.fileUrl) {
      errorMsg = 'message file url is required';
    }
    return errorMsg;
  }

  validateUpdateBroadcastConversation(input: UpdateBroadcastConversationInput) {
    if (hasAttr(input, 'broadcastName')) {
      if (!input.broadcastName) {
        throw new BadRequestException("broadcastName is required");
      }
    }
  }

  validateCreateMessageInput(input: CreateMessageInput) {
    const errors = { messageDetail: [], conversationID: [], senderProfileID: [] };
    if (!input.conversationID) {
      errors.conversationID.push('conversation ID is required');
    }
    if (!input.senderProfileID) {
      errors.conversationID.push('sender profile ID is required');
    }
    if (!input.messageDetail) {
      errors.messageDetail.push('message detail is required');
    } else {
      const errorMsg = this.validateMessageDetail(input.messageDetail);
      if (errorMsg) {
        errors.messageDetail.push(errorMsg);
      }
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });
    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }

  async validateBroadcastConversation(senderProfileID: string, conversationID: string): Promise<Conversation> {
    const conversation = await this.getConversation(conversationID);
    if (conversation) {
      if (conversation.creatorProfileID !== senderProfileID || conversation.conversationType !== ConversationType.BROADCAST) {
        throw new BadRequestException("Conversation is invalid.");
      }
    } else {
      throw new BadRequestException("Conversation not found.");
    }
    return conversation;
  }

  async updateConversation(id: string, params: UpdateConversationInput): Promise<Conversation> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': params }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as Conversation;
  }

  async updateMessageCounter(profileID: string, conversationID: string, inc: number = 1): Promise<void> {
    await dynamoDBService.update({
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      Key: { profileID, conversationID },
      ...dynamoDBService.buildAtomicCounter({ totalMessage: inc })
    });
  }

  async updateConversationMessageCounter(id: string, inc: number = 1): Promise<void> {
    await dynamoDBService.update({
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildAtomicCounter({ totalMessage: inc })
    });
  }

  async updateProfileConversation(profileID: string, conversationID: string, params: UpdateProfileConversationInput): Promise<ProfileConversation> {
    const result = await dynamoDBService.update({
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      Key: { profileID, conversationID },
      ...dynamoDBService.buildUpdateExpression({ 'SET': params }),
      ReturnValues: "ALL_NEW",
    });

    return result.Attributes as ProfileConversation;
  }

  async syncConversationFromMessageDeleted(message: Message) {
    // sync last message time
    const lastMessage = (await this.listMessagesByConversationID(message.conversationID, 1, null, false))[0];
    const profileConversations = await this.listProfileConversationsByConversationID(message.conversationID);
    const conversation = await this.getConversation(message.conversationID);
    const tasks: any[] = [];
    if (lastMessage) {
      for (const pc of profileConversations) {
        tasks.push(this.updateProfileConversation(pc.profileID, pc.conversationID, { lastMessageAt: lastMessage.createdAt }));
      }

      if (conversation) {
        tasks.push(this.updateConversation(message.conversationID, { lastMessageAt: lastMessage.createdAt }));
      }
    }


    // reduce total message
    for (const pc of profileConversations) {
      tasks.push(this.updateMessageCounter(pc.profileID, pc.conversationID, -1));
    }
    if (conversation) {
      tasks.push(this.updateConversationMessageCounter(message.conversationID, -1));
    }

    // exec
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }

  /**
   * 1. Update lastMessageAt for conversation and profile conversation
   * 2. Increase total message in message thread
   * 3. Mark profile conversation as unread
   */
  async syncConversationFromMessage(message: Message) {
    // sync last message time
    const lastMessage = (await this.listMessagesByConversationID(message.conversationID, 1, null, false))[0];
    const profileConversations = await this.listProfileConversationsByConversationID(message.conversationID);
    const tasks: any[] = [];
    if (lastMessage) {
      for (const pc of profileConversations) {
        const params: UpdateProfileConversationInput = { lastMessageAt: lastMessage.createdAt };
        if (pc.profileID !== message.senderProfileID) {
          params.read = false;
        }
        tasks.push(this.updateProfileConversation(pc.profileID, pc.conversationID, params));
      }

      tasks.push(this.updateConversation(message.conversationID, { lastMessageAt: lastMessage.createdAt }));
    }

    // increase total message
    for (const pc of profileConversations) {
      tasks.push(this.updateMessageCounter(pc.profileID, pc.conversationID, 1));
    }
    tasks.push(this.updateConversationMessageCounter(message.conversationID, 1));

    // exec
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }

  async syncConversationFromFollowingTable(senderID: string, recipientID: string, params: UpdateConversationInput) {
    const conversationID: string = await this.getConversationIDByParticipants(senderID, recipientID);
    if (conversationID) {
      const profileConversations = await this.listProfileConversationsByConversationID(conversationID);
      const tasks: any[] = profileConversations.map(async (pc) => {
        return await this.updateProfileConversation(pc.profileID, pc.conversationID, params);
      });
      tasks.push(this.updateConversation(conversationID, params));
      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    }
  }

  async syncProfileConversationFromConversationTable(conversationID: string, params: SyncProfileConversationInput) {
    const profileConversations = await this.listProfileConversationsByConversationID(conversationID);
    const { blockedByProfileIDs, ...profileConversation } = params;

    const tasks: any[] = profileConversations.map(async (pc) => {
      if (blockedByProfileIDs !== undefined) {
        (profileConversation as UpdateProfileConversationInput).blockedByProfileID = blockedByProfileIDs?.find(id => id !== pc.profileID) || null;
      }

      return await this.updateProfileConversation(pc.profileID, pc.conversationID, profileConversation);
    });

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    // validate
    this.validateCreateMessageInput(input);

    if (input.messageDetail) {
      input.messageDetail = this.normalizeMessageDetail(input.messageDetail);
    }

    const now = new Date().toISOString();
    const message: Message = {
      ...input,
      id: uuidv4(),
      __typename: 'Message',
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now
    };
    const params = {
      TableName: API_SITWITHME_MESSAGETABLE_NAME,
      Item: message
    };
    await dynamoDBService.put(params);
    return message;
  }

  /**
   * Cannot push message notification in cases: muted, ignored
   */
  canPushNotif(profileConversation: ProfileConversation): boolean {
    return (
      profileConversation.muteUntil === undefined ||
      (profileConversation.muteUntil && new Date(profileConversation.muteUntil).getTime() <= new Date().getTime())
    ) &&
    (!profileConversation.ignore)
  }

  async validateSendMessage(senderProfile: Profile, recipientProfile: Profile, messageDetail: MessageDetail) {
    const errors = { senderProfile: [], recipientProfile: [], messageDetail: [] };
    if (!senderProfile) {
      errors.senderProfile.push('sender profile is required');
    }
    if (!recipientProfile) {
      errors.recipientProfile.push('recipient profile is required');
    }
    if (!messageDetail) {
      errors.messageDetail.push('message detail is required');
    } else {
      const errorMsg = this.validateMessageDetail(messageDetail);
      if (errorMsg) {
        errors.messageDetail.push(errorMsg);
      }
    }

    // check sitwithme connection in following table
    if (senderProfile && recipientProfile) {
      let staffID: string;
      let patronID: string;
      let target: string;
      if (senderProfile.role == UserRole.STAFF) {
        staffID = senderProfile.id;
        patronID = recipientProfile.id;
        target = 'patron';
      } else {
        staffID = recipientProfile.id;
        patronID = senderProfile.id;
        target = 'staff';
      }
      const following = await followingService.get(staffID, patronID);
      if (!following) {
        errors.senderProfile.push(`You can't send messages because you did't sit with this ${target}.`);
      }
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });
    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }

  validateCreateBroadcastConversation(senderProfile: StaffProfile, recipientProfiles: PatronProfile[], broadcastName: string) {
    const errors = { senderProfile: [], recipientProfiles: [], messageDetail: [], broadcastName: [] };
    if (!senderProfile) {
      errors.senderProfile.push('sender profile is required');
    }
    if (!recipientProfiles.length) {
      errors.recipientProfiles.push('recipient profiles is required');
    }
    if (!broadcastName) {
      errors.broadcastName.push('broadcast name is required');
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });
    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }

  validateCreateBroadcastMessage(senderProfile: StaffProfile, messageDetail: MessageDetail) {
    const errors = { senderProfile: [], messageDetail: [] };
    if (!senderProfile) {
      errors.senderProfile.push('sender profile is required');
    }
    if (!messageDetail) {
      errors.messageDetail.push('message detail is required');
    } else {
      const errorMsg = this.validateMessageDetail(messageDetail);
      if (errorMsg) {
        errors.messageDetail.push(errorMsg);
      }
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key].length) {
        delete errors[key];
      }
    });
    if (Object.keys(errors).length) {
      throw new BadRequestException('Validation failed', ErrorCodeConst.Validation, errors);
    }
  }

  async getConversationIDByParticipants(profileID1: string, profileID2: string): Promise<string> {
    const profileConversations = await this.allProfileNormalConversations(profileID1);
    if (profileConversations.length) {
      const conversationIDs = profileConversations.map(pc => pc.conversationID);
      const recipientProfileConversations = await this.listProfileConversationsInConversationIDs(profileID2, conversationIDs);
      if (recipientProfileConversations.length) {
        return recipientProfileConversations[0].conversationID;
      }
    }
  }

  async getConversationByParticipants(profileID1: string, profileID2: string): Promise<Conversation> {
    const conversationID = await this.getConversationIDByParticipants(profileID1, profileID2);
    if (conversationID) {
      return this.getConversation(conversationID);
    }
  }

  /**
   * Send a message to a recipient, rules:
   *   - staff send message to patron
   *   - staff can't send message to other staff
   *   - patron send message to staff
   *   - patron can't send message to other patron
   *
   * @param messageInput
   */
  async sendMessage(senderProfile: Profile, recipientProfile: Profile, messageDetail: MessageDetail): Promise<Message> {
    // validate first
    await this.validateSendMessage(senderProfile, recipientProfile, messageDetail);

    // 1. If there are no conversation between them, then create it.
    let existedConversation: Conversation = await this.getConversationByParticipants(senderProfile.id, recipientProfile.id);
    if (existedConversation?.blockedByProfileID) {
      throw new BadRequestException("You are blocked from this conversation");
    }

    let conversationID: string = existedConversation?.id;
    if (!conversationID) {
      // Init a new conversation
      const conversation = await this.initConversation(senderProfile, recipientProfile);
      conversationID = conversation.id;
    }

    // 2. create message
    return this.createMessage({
      conversationID,
      senderProfileID: senderProfile.id,
      messageDetail
    });
  }

  async createBroadcastConversation(senderProfile: StaffProfile, recipientProfiles: PatronProfile[], broadcastName: string): Promise<Conversation> {
    this.validateCreateBroadcastConversation(senderProfile, recipientProfiles, broadcastName);

    // 1. always create new broadcast conversation
    const conversation = await this.initBroadcastConversation(senderProfile, recipientProfiles, broadcastName);

    // 2. create message
    // const message = await this.createMessage({
    //   conversationID: broadcastConversation.id,
    //   senderProfileID: senderProfile.id,
    //   messageDetail
    // });

    // 2. staff send 1-1 conversation message to patrons, using SQS to decouple
    await sqsService.sendMessage({
      MessageBody: JSON.stringify({ conversation, eventType: SQSBroadcastEventType.INIT_BROADCAST }),
      QueueUrl: BROADCAST_QUEUE_URL,
      MessageDeduplicationId: uuidv4(),
      MessageGroupId: SQSBroadcastGroupID.SEND_BROADCAST_MESSAGE
    });

    return conversation;
  }

  async createBroadcastMessage(senderProfile: StaffProfile, conversationID: string, messageDetail: MessageDetail): Promise<Message> {
    // 1. validate broadcast conversation
    const conversation = await this.validateBroadcastConversation(senderProfile.id, conversationID);
    this.validateCreateBroadcastMessage(senderProfile, messageDetail);

    // 2. create message
    const message = await this.createMessage({
      conversationID: conversation.id,
      senderProfileID: senderProfile.id,
      messageDetail
    });

    // 3. staff send 1-1 conversation message to patrons, using SQS to decouple
    await sqsService.sendMessage({
      MessageBody: JSON.stringify({ conversation, message, eventType: SQSBroadcastEventType.SEND_BROADCAST_MESSAGE }),
      QueueUrl: BROADCAST_QUEUE_URL,
      MessageDeduplicationId: uuidv4(),
      MessageGroupId: SQSBroadcastGroupID.SEND_BROADCAST_MESSAGE
    });

    return message;
  }

  async syncMessageToConversations(message: Message, conversationIDs: string[], parentConversationID: string) {
    return Promise.all(conversationIDs.map(async (conversationID) => {
      return await this.createMessage({
        ...message,
        conversationID,
        sentFromConversationID: parentConversationID
      });
    }));
  }

  async sendMessageToConversation(senderProfile: Profile, conversationID: string, messageDetail: MessageDetail): Promise<Message> {
    // 1. validate conversation
    const profileConversation: ProfileConversation = await this.getProfileConversation(senderProfile.id, conversationID, ConversationType.NORMAL);
    if (!profileConversation) {
      throw new BadRequestException("Conversation not found");
    }

    if (profileConversation.hide) { // if already leave table
      throw new BadRequestException("Connection is invalid");
    }
    if (profileConversation.blockedByProfileID) {
      throw new BadRequestException("You are blocked from this conversation");
    }

    // 2. create message
    return this.createMessage({
      conversationID,
      senderProfileID: senderProfile.id,
      messageDetail
    });
  }

  async updateProfileConversationConnection(connection: { user?: User, profile?: Profile }) {
    let profileConversation: Partial<ProfileConversation> = {};
    const user = connection.user;
    // const profile = connection.profile;
    let queryExpression: { [key: string]: any } = {};

    // Currently, client app can get avatar from conversation -> profileConversations
    // if (profile) {
    //   const recipientProfileAvatar = profile.avatarID ? await photoService.get(profile.avatarID) : null;
    //   profileConversation.recipientConnection = {
    //     ...profileConversation.recipientConnection,
    //     avatarUrl: recipientProfileAvatar?.url || null,
    //   };
    //   queryExpression = {
    //     IndexName: 'byProfileID',
    //     KeyConditionExpression: '#profileID = :profileID',
    //     ExpressionAttributeNames: {
    //       '#profileID': 'profileID'
    //     },
    //     ExpressionAttributeValues: {
    //       ':profileID': profile.id,
    //     },
    //   };
    // }
    if (user) {
      profileConversation.recipientConnection = {
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        deleted: user.deleted
      };
      queryExpression = {
        IndexName: 'byRecipientUserID',
        KeyConditionExpression: '#recipientUserID = :recipientUserID',
        ExpressionAttributeNames: {
          '#recipientUserID': 'recipientUserID'
        },
        ExpressionAttributeValues: {
          ':recipientUserID': user.id,
        },
      };
    }

    let lastEvalKey;
    do {
      try {
        // Get all explore profiles items
        const { Items, LastEvaluatedKey } = await dynamoDBService.query({
          TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
          ExclusiveStartKey: lastEvalKey,
          ...queryExpression
        });
        lastEvalKey = LastEvaluatedKey;
        console.log('Profile Conversation Items: ', API_SITWITHME_PROFILECONVERSATIONTABLE_NAME, Items);
        if (!Items.length) {
          break;
        }
        // Put new connection change
        const putItems = Items.map((item: Partial<ProfileConversation>) => {
          return {
            ...item,
            recipientConnection: profileConversation.recipientConnection
          }
        });

        // Put item with new update connections
        await dynamoDBService.batchPut(API_SITWITHME_PROFILECONVERSATIONTABLE_NAME, putItems);
      } catch (e) {
        console.log('ERROR: ', e);
      }
    } while (lastEvalKey);
  }

  async deleteProfileConversations(keys: any[]) {
    await dynamoDBService.batchDelete(API_SITWITHME_PROFILECONVERSATIONTABLE_NAME, keys.map(k => ({ profileID: k.profileID, conversationID: k.conversationID })));
  }

  async deleteProfileConversationsByConversationID(conversationID: string) {
    const profileConversations = await this.listProfileConversationsByConversationID(conversationID);
    await this.deleteProfileConversations(profileConversations.map(pc => ({ profileID: pc.profileID, conversationID: pc.conversationID })));
  }

  async deleteMessages(IDs: string[]) {
    await dynamoDBService.batchDelete(API_SITWITHME_MESSAGETABLE_NAME, IDs.map(_id => ({ id: _id })));
  }

  async deleteMessagesByConversationID(conversationID: string) {
    const messages = await this.allMessagesByConversationID(conversationID);
    await this.deleteMessages(messages.map(m => m.id));
  }

  async createPatronsInBroadcastConversation(conversation: Conversation, patronIDs: string[]): Promise<ProfileConversation[]> {
    // validate all first, ensure patron must not exists in broadcast conversation
    const rs: ProfileConversation[] = [];
    for (const patronID of patronIDs) {
      const profile = await profileService.get(patronID);
      if (!profile || profile.role !== UserRole.PATRON) {
        throw new BadRequestException('Invalid Patron');
      }

      // check patron already exists
      const profileConversation = await this.getProfileConversation(patronID, conversation.id, ConversationType.BROADCAST);
      if (profileConversation) {
        const user = await userService.get(profile.userID);
        throw new BadRequestException(`${user?.firstName} ${user?.lastName} already exists in this conversation.`);
      }
    }

    // exec
    for (const patronID of patronIDs) {
      // add patron to broadcast conversation
      // 1. Create a new broadcast profile conversation
      const patronConversation = await this.createProfileConversation({
        conversationID: conversation.id,
        conversationType: conversation.conversationType,
        profileID: patronID,
        broadcastName: conversation.broadcastName
      });
      rs.push(patronConversation);

      // 2. Create 1-1 staff with this patron if not exists
      // and sync old messages to 1-1 conversation via SQS
      await sqsService.sendMessage({
        MessageBody: JSON.stringify({ conversation, patronConversation, eventType: SQSBroadcastEventType.PATRON_ADDED }),
        QueueUrl: BROADCAST_QUEUE_URL,
        MessageDeduplicationId: uuidv4(),
        MessageGroupId: SQSBroadcastGroupID.SEND_BROADCAST_MESSAGE
      });
    }

    return rs;
  }

  async updatePatronsInBroadcastConversation(conversation: Conversation, patronIDs: string[]) {
    // validate all first, ensure patron must not exists in broadcast conversation
    const existsPatrons = await this.listPatronsByBroadcastConversationID(conversation.creatorProfileID, conversation.id);
    const existsPatronIDs = existsPatrons.map(profile => profile.id);

    const deletedPatronIDs = existsPatronIDs.filter(existsPatronID => !patronIDs.includes(existsPatronID));
    const newPatronIDs = patronIDs.filter(patronID => !existsPatronIDs.includes(patronID));

    for (const patronID of newPatronIDs) {
      const profile = await profileService.get(patronID);
      if (!profile || profile.role !== UserRole.PATRON) {
        throw new BadRequestException('Invalid Patron');
      }
    }

    // exec add new patron
    for (const patronID of newPatronIDs) {
      // add patron to broadcast conversation
      // 1. Create a new broadcast profile conversation
      const patronConversation = await this.createProfileConversation({
        conversationID: conversation.id,
        conversationType: conversation.conversationType,
        profileID: patronID,
        broadcastName: conversation.broadcastName
      });

      // 2. Create 1-1 staff with this patron if not exists
      // and sync old messages to 1-1 conversation via SQS
      await sqsService.sendMessage({
        MessageBody: JSON.stringify({ conversation, patronConversation, eventType: SQSBroadcastEventType.PATRON_ADDED }),
        QueueUrl: BROADCAST_QUEUE_URL,
        MessageDeduplicationId: uuidv4(),
        MessageGroupId: SQSBroadcastGroupID.SEND_BROADCAST_MESSAGE
      });
    }

    // exec remove patron
    const tasks = deletedPatronIDs.map(patronID =>this.deleteProfileConversation(patronID, conversation.id));
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }

  /**
   * 1. Create a new broadcast profile conversation
   * 2. sync old messages to 1-1 conversation via SQS
   * @param conversation
   * @param patronConversation
   */
  async syncNewPatronConversationMessage(conversation: Conversation, patronConversation: ProfileConversation) {
    // 1. Create a new broadcast profile conversation
    // Create 1-1 conversation if doesn't exist
    const senderProfile = await profileService.get(conversation.creatorProfileID);
    const recipientProfile = await profileService.get(patronConversation.profileID);
    let con = await this.getConversationByParticipants(senderProfile.id, patronConversation.profileID);
    const tasks: Promise<any>[] = [];
    if (!con) {
      con = await this.createConversation({
        conversationType: ConversationType.NORMAL,
        creatorProfileID: senderProfile.id,
        parentConversationID: conversation.id
      });

      const recipient = await userService.get(recipientProfile.userID);
      const sender = await userService.get(senderProfile.userID);

      // Staff Sender
      tasks.push(this.createProfileConversation({
        conversationID: con.id,
        conversationType: con.conversationType,
        profileID: senderProfile.id,
        recipientConnection: {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          userName: recipient.userName
        },
        recipientUserID: recipient.id
      }));

      // Patron Recipient
      tasks.push(this.createProfileConversation({
        conversationID: con.id,
        conversationType: con.conversationType,
        profileID: recipientProfile.id,
        recipientConnection: {
          firstName: sender.firstName,
          lastName: sender.lastName,
          userName: sender.userName
        },
        recipientUserID: sender.id
      }));
    } else {
      await this.updateConversation(con.id, { parentConversationID: conversation.id });
    }

    // 2. sync old messages to 1-1 conversation
    const messages = await this.allMessagesByProfileIDAndConversationID(senderProfile.id, conversation.id);
    for (const message of messages) {
      tasks.push(this.createMessage({
        ...message,
        conversationID: con.id,
        sentFromConversationID: conversation.id
      }));
    }

    while (tasks.length) {
      await Promise.all(tasks.splice(0, 20));
    }
  }

  normalizeMessageDetail(messageDetail: MessageDetail) {
    if (messageDetail.messageType === MessageType.TEXT) {
      delete messageDetail.fileUrl;
    } else if (messageDetail.messageType === MessageType.FILE) {
      try {
        new URL(messageDetail.fileUrl);
      } catch (e) {
        // inject cloudfront domain if not URL (for S3 upload)
        if (e.code === 'ERR_INVALID_URL') {
          messageDetail.fileUrl = getFileUrlFromS3(ASSET_BASE_URL, messageDetail.fileUrl);
        }
      }

      delete messageDetail.text;
    }

    return messageDetail;
  }

  async notifyProfileConversationUpdated(profileConversation: ProfileConversationUpdated) {
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.PROFILE_CONVERSATION_UPDATED, body: profileConversation };
      console.log('Push notifyProfileConversationUpdated:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
      console.log('Pushed notifyProfileConversationUpdated:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
    } catch (e) {
      console.log('ERROR when notifyProfileConversationUpdated - push notification: ', e);
    }
  }

  async listBroadcastsByStaffID(staffID: string): Promise<Conversation[]> {
    const result = await dynamoDBService.query({
      TableName: API_SITWITHME_CONVERSATIONTABLE_NAME,
      IndexName: 'byCreatorProfileIDSortByConversationType',
      KeyConditionExpression: '#creatorProfileID = :creatorProfileID AND #conversationType = :conversationType',
      ExpressionAttributeNames: {
        '#creatorProfileID': 'creatorProfileID',
        '#conversationType': 'conversationType'
      },
      ExpressionAttributeValues: {
        ':creatorProfileID': staffID,
        ':conversationType': ConversationType.BROADCAST
      }
    });
    if (result.Items?.length) {
      return result.Items as Conversation[];
    }
    return [];
  }

  async deleteProfileConversation(profileID: string, conversationID: string) {
    const params = {
      TableName: API_SITWITHME_PROFILECONVERSATIONTABLE_NAME,
      Key: { profileID, conversationID }
    };
    await dynamoDBService.delete(params);
  }

  /**
   * Delete this patron out of all staff broadcast conversation
   *
   * 1. Find all staff broadcrast conversations
   * 2. If this patron in this broadcast, then delete them
   */
  async deletePatronInAllBroadcastsByStaffID(staffID: string, patronID: string) {
    // 1. Find all staff broadcrast conversations
    const broadcasts = await this.listBroadcastsByStaffID(staffID);

    // 2. If this patron in this broadcast, then delete them
    const tasks: any[] = [];
    for (const broadcast of broadcasts) {
      const pc = await this.getProfileConversation(patronID, broadcast.id, ConversationType.BROADCAST);
      if (pc) {
        tasks.push(this.deleteProfileConversation(patronID, broadcast.id));
      }
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }

  async unreadMessagesNumber(profileID: string): Promise<number> {
    const profileConversations = await this.allUnreadProfileConversations(profileID);
    return profileConversations.length;
  }

  async notifyMessageReaction(messageReactionInput: NotifyMessageReactionInput) {
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.SEND_MESSAGE_REACTION, body: messageReactionInput };
      console.log('Push notifyMessageReaction:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
      console.log('Pushed notifyMessageReaction:', PUSH_NOTIFICATION_TOPIC_ARN, notificationSNSMessage);
    } catch (e) {
      console.log('ERROR when notifyMessageReaction - push notification: ', e);
    }
  }

  async get(id: string): Promise<Message> {
    return <Message>(await dynamoDBService.get({
      TableName: API_SITWITHME_MESSAGETABLE_NAME,
      Key: { id },
    })).Item;
  }

  async allMessageReactionsByProfileID(profileID: string): Promise<MessageReaction[]> {
    const result = await dynamoDBService.queryAll({
      TableName: API_SITWITHME_MESSAGEREACTIONTABLE_NAME,
      IndexName: 'byProfileIDSortByCreatedAt',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID',
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    });
    return result as MessageReaction[];
  }
}
