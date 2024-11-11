import { MessageService } from './message.service';
import { DynamoDBService } from './dynamodb.service';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from './user.service';
import { ProfileService } from './profile.service';
import { Conversation, ProfileConversation, UpdateBroadcastConversationInput, Message, ConversationType, MessageType, CreateMessageInput, MessageDetail } from '@swm-core/interfaces/message.interface';
import { addMinutes } from '@swm-core/utils/date.util';
import { PatronProfile, Profile, UserRole } from '@swm-core/interfaces/profile.interface';
import { generateConversation, generateMessage, generateMessages, generateProfileConversation, generateProfileConversations } from '@swm-test/factories/message.factory';
import { generateProfile, generateProfiles } from '@swm-test/factories/profile.factory';
import { User } from '@swm-core/interfaces/user.interface';
import { generateUser } from '@swm-test/factories/user.factory';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { FollowingService } from './following.service';
import { Following } from '@swm-core/interfaces/following.interface';
import { SQSService } from './sqs-service';

const messageService = new MessageService();
const dynamoDBService = DynamoDBService.prototype;
const userService = UserService.prototype;
const profileService = ProfileService.prototype;
const followingService = FollowingService.prototype;
const sqsService = SQSService.prototype;

describe('messageService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('deleteConversation', () => {
    describe('success', () => {
      it('should return undefined after delete conversation', async () => {
        jest.spyOn(dynamoDBService, 'delete').mockImplementation(() => null);
        const conversationID: string = uuidv4();
        const result = await messageService.deleteConversation(conversationID);
        expect(result).toEqual(undefined);
      });
    });
  });

  describe('updateBroadcastConversation', () => {
    describe('success', () => {
      it('should return broadcast after updating succeed', () => {
        jest.spyOn(dynamoDBService, 'buildUpdateExpression').mockImplementation(() => null);
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => { return { Attributes: {} } as any});
        const broadcastID: string = uuidv4();
        const broadcastInput: UpdateBroadcastConversationInput = {
          broadcastName: 'string',
        }
        const result = messageService.updateBroadcastConversation(broadcastID, broadcastInput);
        expect(result).toBeTruthy();
      });
    });
    describe('error', () => {
      it('should throw error if missing broadcast name', () => {
        const broadcastID: string = uuidv4();
        const broadcastInput: UpdateBroadcastConversationInput = {
          broadcastName: '',
        }
        expect(messageService.updateBroadcastConversation(broadcastID, broadcastInput)).rejects.toThrow('broadcastName is required');
      });
    });
  });

  describe('allUnreadProfileConversations', () => {
    describe('success', () => {
      it('should return all unread profile conversation', async () => {
        const now = new Date();
        const profileConversations: ProfileConversation[] = [
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: true,
          },
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: true,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: true,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, 1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -2).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
        ];
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: profileConversations } });

        const result = await messageService.allUnreadProfileConversations(uuidv4());
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('allProfileNormalConversations', () => {
    describe('success', () => {
      it('should return all profile normal conversation', async () => {
        const now = new Date();
        const profileConversations: ProfileConversation[] = [
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: true,
          },
        ];
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: profileConversations } });

        const result = await messageService.allProfileNormalConversations(uuidv4());
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('getProfileConversation', () => {
    describe('success', () => {
      it('should return profile conversation by get conversation', async () => {
        const now = new Date();
        const profileConversations: ProfileConversation[] = [
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID: uuidv4(),
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: true,
          },
        ];
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: profileConversations } });

        const profileConversation = profileConversations[0];
        const result = await messageService.getProfileConversation(profileConversation.profileID, profileConversation.conversationID, profileConversation.conversationType);
        expect(result).toMatchObject(profileConversation);
      });
    });
  });

  describe('listProfileConversationsByConversationID', () => {
    describe('success', () => {
      it('should return all profile conversation by conversation id', async () => {
        const now = new Date();
        const conversationID = uuidv4();
        const profileConversations: ProfileConversation[] = [
          {
            profileID: uuidv4(),
            conversationID,
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID,
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: true,
          },
        ];
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: profileConversations } });

        const result = await messageService.listProfileConversationsByConversationID(conversationID);
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('listConversationsByBroadcastConversationID', () => {
    describe('success', () => {
      it('should return all conversation by broadcast conversation id', async () => {
        const now = new Date();
        const conversationID = uuidv4();
        const conversations: Conversation[] = [
          {
            id: uuidv4(),
            creatorProfileID: uuidv4(),
            __typename: 'Conversation',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            hide: false,
            blockedByProfileID: uuidv4(),
          },
          {
            id: uuidv4(),
            creatorProfileID: uuidv4(),
            __typename: 'Conversation',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            hide: false,
            blockedByProfileID: uuidv4(),
          },
        ];
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: conversations } });

        const result = await messageService.listConversationsByBroadcastConversationID(conversationID);
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('listPatronsByBroadcastConversationID', () => {
    describe('success', () => {
      it('should list patrons by broadcast conversation id', async() => {
        const now = new Date();
        const conversation: Conversation = {
          id: uuidv4(),
          creatorProfileID: uuidv4(),
          __typename: 'Conversation',
          conversationType: ConversationType.BROADCAST,
          lastMessageAt: now.toISOString(),
          broadcastName: 'string',
          hide: false,
          blockedByProfileID: uuidv4(),
        };
        const profileConversations: ProfileConversation[] = [
          {
            profileID: uuidv4(),
            conversationID: conversation.id,
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: false,
          },
          {
            profileID: uuidv4(),
            conversationID: conversation.id,
            __typename: 'Message',
            conversationType: ConversationType.NORMAL,
            lastMessageAt: now.toISOString(),
            broadcastName: 'string',
            deletedAt: addMinutes(now, -1).toISOString(),
            muteUntil: now.toISOString(),
            ignore: false,
            hide: false,
            blockedByProfileID: uuidv4(),
            read: true,
          },
        ];
        const patrons: PatronProfile[] = generateProfiles(5, { role: UserRole.PATRON });
        jest.spyOn(messageService, 'getConversation').mockImplementation(async () => conversation);
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: profileConversations } });
        jest.spyOn(profileService, 'batchGet').mockImplementation(async () => patrons);

        const result = await messageService.listPatronsByBroadcastConversationID(conversation.creatorProfileID, conversation.id);
        expect(result).toHaveLength(5);
      });
    });
  });

  describe('listProfileConversationsInConversationIDs', () => {
    describe('success', () => {
      it('should return list profile conversations in conversation ids', async () => {
        const profileID: string = uuidv4();
        const conversationID1: string = uuidv4();
        const conversationID2: string = uuidv4();
        const conversationID3: string = uuidv4();
        const profileConversations: ProfileConversation[] = [
          generateProfileConversation({ conversationID: conversationID1 }),
          generateProfileConversation({ conversationID: conversationID2 }),
          generateProfileConversation({ conversationID: conversationID3 }),
        ];
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: profileConversations } });

        const result = await messageService.listProfileConversationsInConversationIDs(profileID, [conversationID1, conversationID3]);
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('listMessagesByConversationID', () => {
    describe('success', () => {
      it('should return list message by conversation id', async () => {
        const conversationID: string = uuidv4();
        const messages: Message[] = generateMessages(5, { conversationID });
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: messages } });

        const result = await messageService.listMessagesByConversationID(conversationID);
        expect(result).toHaveLength(5);
      });
    });
  });

  describe('allMessagesByProfileIDAndConversationID', () => {
    describe('success', () => {
      it('should return all message by profile id and conversation id', async () => {
        const conversationID: string = uuidv4();
        const senderProfileID: string = uuidv4();
        const messages: Message[] = generateMessages(5, { conversationID, senderProfileID });
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: messages } });

        const result = await messageService.allMessagesByProfileIDAndConversationID(senderProfileID, conversationID);
        expect(result).toHaveLength(5);
      });
    });
  });

  describe('allMessagesBySentFromConversationID', () => {
    describe('success', () => {
      it('should return all message by profile id and conversation id', async () => {
        const conversationID: string = uuidv4();
        const messages: Message[] = generateMessages(5, { conversationID });
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: messages } });

        const result = await messageService.allMessagesBySentFromConversationID(conversationID);
        expect(result).toHaveLength(5);
      });
    });
  });

  describe('allMessagesByConversationID', () => {
    describe('success', () => {
      it('should return all message by profile id and conversation id', async () => {
        const conversationID: string = uuidv4();
        const messages: Message[] = generateMessages(5, { conversationID });
        jest.spyOn(dynamoDBService, 'query').mockImplementation(async () => { return { Items: messages } });

        const result = await messageService.allMessagesByConversationID(conversationID);
        expect(result).toHaveLength(5);
      });
    });
  });

  describe('createConversation', () => {
    describe('success', () => {
      it('should return all message by profile id and conversation id', async () => {
        const conversation = generateConversation();
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);

        const result = await messageService.createConversation(conversation);
        expect(result.creatorProfileID).toBe(conversation.creatorProfileID);
        expect(result.conversationType).toBe(conversation.conversationType);
        expect(result.broadcastName).toBe(conversation.broadcastName);
        expect(result.parentConversationID).toBe(conversation.parentConversationID);
        expect(result.totalMessage).toBe(0);
      });
    });
  });

  describe('createProfileConversation', () => {
    describe('success', () => {
      it('should return all message by profile id and conversation id', async () => {
        const profileConversation = generateProfileConversation();
        jest.spyOn(dynamoDBService, 'put').mockImplementation(() => null);

        const result = await messageService.createProfileConversation(profileConversation);
        expect(result.profileID).toBe(profileConversation.profileID);
        expect(result.conversationID).toBe(profileConversation.conversationID);
        expect(result.conversationType).toBe(profileConversation.conversationType);
        expect(result.recipientConnection).toBe(profileConversation.recipientConnection);
        expect(result.recipientUserID).toBe(profileConversation.recipientUserID);
        expect(result.broadcastName).toBe(profileConversation.broadcastName);
      });
    });
  });

  describe('initConversationsFromBroadcast', () => {
    describe('success', () => {
      it('should return undefined after init conversation from broadcast', async () => {
        const profile: Profile = generateProfile();
        const sender: User = generateUser();
        const profileConversations = generateProfileConversations(2);
        const conversation = generateConversation({ conversationType: ConversationType.BROADCAST });

        jest.spyOn(profileService, 'get').mockImplementation(async () => profile);
        jest.spyOn(userService, 'get').mockImplementation(async () => sender);
        jest.spyOn(messageService, 'listProfileConversationsByConversationID').mockImplementation(async () => profileConversations);
        jest.spyOn(messageService, 'updateConversation').mockImplementation(() => null);
        jest.spyOn(messageService, 'getConversationByParticipants').mockImplementation(async () => conversation);
        jest.spyOn(messageService, 'createConversation').mockImplementation(() => null);

        const result = await messageService.initConversationsFromBroadcast(conversation);
        expect(result).toBe(undefined);
      });
    });
  });

  describe('initConversation', () => {
    describe('success', () => {
      it('should return conversation after init conversation', async () => {
        const senderProfile: Profile = generateProfile({ role: UserRole.PATRON });
        const recipientProfile: Profile = generateProfile({ role: UserRole.STAFF });
        const sender: User = generateUser();
        const recipient: User = generateUser();
        const conversation: Conversation = generateConversation();
        jest.spyOn(userService, 'get')
          .mockImplementationOnce(async () => sender)
          .mockImplementation(async () => recipient);
        jest.spyOn(messageService, 'createConversation').mockImplementation(async () => conversation);
        jest.spyOn(messageService, 'createProfileConversation').mockImplementation();

        const result = await messageService.initConversation(senderProfile, recipientProfile);
        expect(result).toEqual(conversation);
      });
    });
    describe('error', () => {
      it('should throw "Only Staff/Patron can send message together" when send message to same role', async () => {
        const senderProfile: Profile = generateProfile({ role: UserRole.PATRON });
        const recipientProfile: Profile = generateProfile({ role: UserRole.PATRON });
        await expect(messageService.initConversation(senderProfile, recipientProfile)).rejects.toThrow('Only Staff/Patron can send message together');

        const senderProfile1: Profile = generateProfile({ role: UserRole.STAFF });
        const recipientProfile1: Profile = generateProfile({ role: UserRole.STAFF });
        await expect(messageService.initConversation(senderProfile1, recipientProfile1)).rejects.toThrow('Only Staff/Patron can send message together');
      });
      it('should throw "Sender not found" when sender profile not found/error', async () => {
        const senderProfile: Profile = generateProfile({ role: UserRole.PATRON });
        const recipientProfile: Profile = generateProfile({ role: UserRole.STAFF });
        jest.spyOn(userService, 'get').mockImplementationOnce(null);

        await expect(messageService.initConversation(senderProfile, recipientProfile)).rejects.toThrow('Sender not found');

        const senderProfile1: Profile = generateProfile({ role: UserRole.PATRON });
        const recipientProfile1: Profile = generateProfile({ role: UserRole.STAFF });
        jest.spyOn(userService, 'get').mockImplementationOnce(async () => { throw new BadRequestException('Sender not found') } );

        await expect(messageService.initConversation(senderProfile1, recipientProfile1)).rejects.toThrow('Sender not found');
      });
      it('should throw "Recipient not found" when recipient profile not found/error', async () => {
        const senderProfile: Profile = generateProfile({ role: UserRole.PATRON });
        const recipientProfile: Profile = generateProfile({ role: UserRole.STAFF });
        const sender: User = generateUser();
        jest.spyOn(userService, 'get')
          .mockImplementationOnce(async () => sender)
          .mockImplementation();

        await expect(messageService.initConversation(senderProfile, recipientProfile)).rejects.toThrow('Recipient not found');

        const senderProfile1: Profile = generateProfile({ role: UserRole.PATRON });
        const recipientProfile1: Profile = generateProfile({ role: UserRole.STAFF });
        jest.spyOn(userService, 'get')
          .mockImplementationOnce(async () => sender)
          .mockImplementation(async () => { throw new BadRequestException('Recipient not found') });

        await expect(messageService.initConversation(senderProfile1, recipientProfile1)).rejects.toThrow('Recipient not found');
      });
      it(`should throw "You can't send message to yourself" if profile duplicate`, async () => {
        const senderProfile: Profile = generateProfile({ role: UserRole.PATRON });
        const recipientProfile: Profile = generateProfile({ role: UserRole.STAFF });
        const sender: User = generateUser();
        jest.spyOn(userService, 'get')
          .mockImplementationOnce(async () => sender)
          .mockImplementation(async () => sender);

        await expect(messageService.initConversation(senderProfile, recipientProfile)).rejects.toThrow("You can't send message to yourself");
      });
    });
  });

  describe('initBroadcastConversation', () => {
    describe('success', () => {
      it('should return broadcast conversation after create', async () => {
        const senderProfile: Profile = generateProfile({ role: UserRole.STAFF });
        const recipientProfile: Profile = generateProfile({ role: UserRole.PATRON });
        const sender: User = generateUser();
        const conversation: Conversation = generateConversation({ conversationType: ConversationType.BROADCAST });
        const broadcastName: string = 'Broadcast';
        jest.spyOn(userService, 'get').mockImplementation(async () => sender);
        jest.spyOn(messageService, 'createConversation').mockImplementation(async () => conversation);
        jest.spyOn(messageService, 'createProfileConversation').mockImplementation();

        const result = await messageService.initBroadcastConversation(senderProfile, [recipientProfile], broadcastName);
        expect(result).toEqual(conversation);
      });
    });
    describe('error', () => {
      it('should throw "Sender not found" if sender profile not found', async () => {
        const senderProfile: Profile = generateProfile({ role: UserRole.STAFF });
        const recipientProfile: Profile = generateProfile({ role: UserRole.PATRON });
        const broadcastName: string = 'Broadcast';
        jest.spyOn(userService, 'get').mockImplementation();

        await expect(messageService.initBroadcastConversation(senderProfile, [recipientProfile], broadcastName)).rejects.toThrow('Sender not found');

        const senderProfile1: Profile = generateProfile({ role: UserRole.STAFF });
        const recipientProfile1: Profile = generateProfile({ role: UserRole.PATRON });
        jest.spyOn(userService, 'get').mockImplementation(async () => { throw new Error() });

        await expect(messageService.initBroadcastConversation(senderProfile1, [recipientProfile1], broadcastName)).rejects.toThrow('Sender not found');
      });
    });
  });

  describe('validateMessageDetail', () => {
    describe('success', () => {
      it('should return undefined if valid message', () => {
        expect(messageService.validateMessageDetail({
          messageType: MessageType.TEXT,
          text: 'string',
        })).toEqual(undefined);
        expect(messageService.validateMessageDetail({
          messageType: MessageType.FILE,
          fileUrl: 'string',
        })).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should return error if invalid message', () => {
        expect(messageService.validateMessageDetail({
          messageType: MessageType.TEXT,
          fileUrl: 'string',
        })).toEqual('message text is required');
        expect(messageService.validateMessageDetail({
          messageType: MessageType.FILE,
          text: 'string',
        })).toEqual('message file url is required');
      });
    });
  });

  describe('validateUpdateBroadcastConversation', () => {
    describe('error', () => {
      it('should throw "broadcastName is required" if missing broadcast name', () => {
        expect(() => messageService.validateUpdateBroadcastConversation({ broadcastName: null })).toThrow('broadcastName is required');
      });
    });
  });

  describe('validateCreateMessageInput', () => {
    describe('error', () => {
      it('should throw error "validation failed" if invalid message input', () => {
        try {
          messageService.validateCreateMessageInput({
            messageDetail: null,
            conversationID: null,
            senderProfileID: null,
          })
        } catch(error) {
          expect(error).toHaveProperty('errors', {
            "conversationID": ["conversation ID is required", "sender profile ID is required"],
            "messageDetail": ["message detail is required"]
          });
        }
      });
    });
  });

  describe('validateBroadcastConversation', () => {
    describe('success', () => {
      it('should return conversation after validate broadcast successful', async () => {
        const senderProfileID: string = uuidv4();
        const conversationID: string = uuidv4();
        const conversation: Conversation = generateConversation({ creatorProfileID: senderProfileID, conversationType: ConversationType.BROADCAST });
        jest.spyOn(messageService, 'getConversation').mockImplementation(async () => conversation);

        const result = await messageService.validateBroadcastConversation(senderProfileID, conversationID);
        expect(result).toEqual(conversation);
      });
    });
    describe('error', () => {
      it('should throw "Conversation is invalid." if invalid sender profile or conversation type', async () => {
        const senderProfileID: string = uuidv4();
        const conversationID: string = uuidv4();
        const conversation: Conversation = generateConversation({ creatorProfileID: senderProfileID });
        jest.spyOn(messageService, 'getConversation').mockImplementation(async () => conversation);

        await expect(messageService.validateBroadcastConversation(senderProfileID, conversationID)).rejects.toThrow('Conversation is invalid.');

        const conversation1: Conversation = generateConversation({ conversationType: ConversationType.BROADCAST });
        jest.spyOn(messageService, 'getConversation').mockImplementation(async () => conversation1);

        await expect(messageService.validateBroadcastConversation(senderProfileID, conversationID)).rejects.toThrow('Conversation is invalid.');
      });
    });
  });

  describe('updateConversation', () => {
    describe('success', () => {
      it('should return conversation after updating conversation', async () => {
        const conversation = generateConversation();
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => { return { Attributes: { ...conversation } } as any });

        const result = await messageService.updateConversation(uuidv4(), {});
        expect(result).toEqual(conversation);
      });
    });
  });

  describe('updateMessageCounter', () => {
    describe('success', () => {
      it('should return undefined after add update message counter', async () => {
        jest.spyOn(dynamoDBService, 'update').mockImplementation();

        const result = await messageService.updateMessageCounter(uuidv4(), uuidv4());
        expect(result).toEqual(undefined);
      });
    });
  });

  describe('updateConversationMessageCounter', () => {
    describe('success', () => {
      it('should return undefined after add conversation message counter', async () => {
        jest.spyOn(dynamoDBService, 'update').mockImplementation();

        const result = await messageService.updateConversationMessageCounter(uuidv4(), 1);
        expect(result).toEqual(undefined);
      });
    });
  });

  describe('updateProfileConversation', () => {
    describe('success', () => {
      it('should return profile conversation after updating profile conversation', async () => {
        const profileConversation = generateProfileConversation();
        jest.spyOn(dynamoDBService, 'update').mockImplementation(async () => { return { Attributes: { ...profileConversation } } as any });

        const result = await messageService.updateConversation(uuidv4(), {});
        expect(result).toEqual(profileConversation);
      });
    });
  });

  describe('syncConversationFromMessageDeleted', () => {
    describe('success', () => {
      it('should return undefined after sync conversation from message deleted', async () => {
        const message = generateMessage();
        const conversation = generateConversation();
        const profileConversations = generateProfileConversations(2, { conversationID: conversation.id });
        jest.spyOn(messageService, 'listMessagesByConversationID').mockImplementation(async () => [message]);
        jest.spyOn(messageService, 'listProfileConversationsByConversationID').mockImplementation(async () => profileConversations);
        jest.spyOn(messageService, 'getConversation').mockImplementation(async () => conversation);

        jest.spyOn(messageService, 'updateProfileConversation').mockImplementation();
        jest.spyOn(messageService, 'updateConversation').mockImplementation();
        jest.spyOn(messageService, 'updateMessageCounter').mockImplementation();
        jest.spyOn(messageService, 'updateConversationMessageCounter').mockImplementation();

        const result = await messageService.syncConversationFromMessageDeleted(message);
        expect(result).toEqual(undefined);
      });
    });
  });

  describe('syncConversationFromMessage', () => {
    describe('success', () => {
      it('should return undefined after sync conversation from message', async () => {
        const message = generateMessage();
        const conversation = generateConversation();
        const profileConversations = generateProfileConversations(2, { conversationID: conversation.id });
        jest.spyOn(messageService, 'listMessagesByConversationID').mockImplementation(async () => [message]);
        jest.spyOn(messageService, 'listProfileConversationsByConversationID').mockImplementation(async () => profileConversations);

        jest.spyOn(messageService, 'updateProfileConversation').mockImplementation();
        jest.spyOn(messageService, 'updateConversation').mockImplementation();
        jest.spyOn(messageService, 'updateMessageCounter').mockImplementation();
        jest.spyOn(messageService, 'updateConversationMessageCounter').mockImplementation();

        const result = await messageService.syncConversationFromMessage(message);
        expect(result).toEqual(undefined);
      });
    });
  });

  describe('syncConversationFromFollowingTable', () => {
    describe('success', () => {
      it('should return undefined after sync conversation from following table', async () => {
        const conversationID = uuidv4();
        const senderID = uuidv4();
        const recipientID = uuidv4();
        const profileConversations = generateProfileConversations(2, { conversationID });
        jest.spyOn(messageService, 'getConversationIDByParticipants').mockImplementation(async () => conversationID);
        jest.spyOn(messageService, 'listProfileConversationsByConversationID').mockImplementation(async () => profileConversations);
        jest.spyOn(messageService, 'updateProfileConversation').mockImplementation();
        jest.spyOn(messageService, 'updateConversation').mockImplementation();

        const result = await messageService.syncConversationFromFollowingTable(senderID, recipientID, {});
        expect(result).toEqual(undefined);
      });
    });
  });

  describe('syncProfileConversationFromConversationTable', () => {
    describe('success', () => {
      it('should return undefined after sync profile conversation from conversation', async () => {
        const conversationID = uuidv4();
        const senderID = uuidv4();
        const profileConversations = generateProfileConversations(2, { conversationID });
        jest.spyOn(messageService, 'listProfileConversationsByConversationID').mockImplementation(async () => profileConversations);
        jest.spyOn(messageService, 'updateProfileConversation').mockImplementation();

        const result = await messageService.syncProfileConversationFromConversationTable(conversationID, {});
        expect(result).toEqual(undefined);
      });
    });
  });

  describe('createMessage', () => {
    describe('success', () => {
      it('should return message after create', async () => {
        const messageInput: CreateMessageInput = {
          messageDetail: {
            messageType: MessageType.TEXT,
            text: 'string',
          },
          conversationID: uuidv4(),
          senderProfileID: uuidv4(),
        }
        jest.spyOn(dynamoDBService, 'put').mockImplementation();

        const result = await messageService.createMessage(messageInput);
        expect(result).toMatchObject(messageInput);
      });
    });
  });

  describe('canPushNotif', () => {
    describe('success', () => {
      it('should return true if profile conversation is ready for pushing notification', () => {
        const profileConversation = generateProfileConversation({
          muteUntil: addMinutes(new Date(), -1).toISOString(),
          ignore: false
        });

        expect(messageService.canPushNotif(profileConversation)).toEqual(true);
      });
      it('should return false if profile conversation is not ready for pushing notification', () => {
        const profileConversation = generateProfileConversation({
          muteUntil: addMinutes(new Date(), -1).toISOString(),
          ignore: true
        });

        expect(messageService.canPushNotif(profileConversation)).toEqual(false);

        const profileConversation1 = generateProfileConversation({
          muteUntil: addMinutes(new Date(), 1).toISOString(),
          ignore: true
        });

        expect(messageService.canPushNotif(profileConversation1)).toEqual(false);
      });
    });
  });

  describe('validateSendMessage', () => {
    describe('success', () => {
      it('should return undefined after validate message', async () => {
        const senderProfile: Profile = generateProfile();
        const recipientProfile: Profile = generateProfile();
        const messageDetail: MessageDetail = {
          messageType: MessageType.TEXT,
          text: 'string',
        };
        jest.spyOn(followingService, 'get').mockImplementation(async () => {return {} as Following});

        const result = await messageService.validateSendMessage(senderProfile, recipientProfile, messageDetail);
        expect(result).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should throw validation failed if validate failure', async () => {
        const senderProfile: Profile = null;
        const recipientProfile: Profile = null;
        const messageDetail: MessageDetail = null;
        jest.spyOn(followingService, 'get').mockImplementation(async () => { return {} as Following });

        await expect(messageService.validateSendMessage(senderProfile, recipientProfile, messageDetail)).rejects.toThrow('Validation failed');

        jest.spyOn(followingService, 'get').mockImplementation(async () => { throw new Error()});

        await expect(messageService.validateSendMessage(senderProfile, recipientProfile, messageDetail)).rejects.toThrow('Validation failed');
      });
    });
  });

  describe('validateCreateBroadcastConversation', () => {
    describe('success', () => {
      it('should return undefined after validate broadcast conversation success', () => {
        const senderProfile: Profile = generateProfile();
        const recipientProfile: Profile = generateProfile();
        const broadcastName: string = 'string';

        const result = messageService.validateCreateBroadcastConversation(senderProfile, [recipientProfile], broadcastName);
        expect(result).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should throw error after validate broadcast conversation failure', () => {
        const senderProfile: Profile = null;
        const recipientProfile: Profile = null;
        const broadcastName: string = '';

        expect(() => messageService.validateCreateBroadcastConversation(senderProfile, [recipientProfile], broadcastName)).toThrow('Validation failed');
      });
    });
  });

  describe('validateCreateBroadcastMessage', () => {
    describe('success', () => {
      it('should return undefined after validate broadcast message success', () => {
        const senderProfile: Profile = generateProfile();
        const messageDetail: MessageDetail = {
          messageType: MessageType.TEXT,
          text: 'string',
        };

        const result = messageService.validateCreateBroadcastMessage(senderProfile, messageDetail);
        expect(result).toEqual(undefined);
      });
    });
    describe('error', () => {
      it('should throw error after validate broadcast message failure', () => {
        const senderProfile: Profile = null;
        const messageDetail: MessageDetail = null;

        expect(() => messageService.validateCreateBroadcastMessage(senderProfile, messageDetail)).toThrow('Validation failed');
      });
    });
  });

  describe('getConversationIDByParticipants', () => {
    describe('success', () => {
      it('should return conversation id', async () => {
        const profileConversations = generateProfileConversations(2);
        jest.spyOn(messageService, 'allProfileNormalConversations').mockImplementation(async () => profileConversations);
        jest.spyOn(messageService, 'listProfileConversationsInConversationIDs').mockImplementation(async () => profileConversations);

        const result = await messageService.getConversationIDByParticipants(uuidv4(), uuidv4());
        expect(result).toEqual(profileConversations[0].conversationID);
      });
    });
  });

  describe('getConversationByParticipants', () => {
    it('should return conversation', async () => {
      const conversation = generateConversation();
      jest.spyOn(messageService, 'getConversationIDByParticipants').mockImplementation(async () => conversation.id);
      jest.spyOn(messageService, 'getConversation').mockImplementation(async () => conversation);

      const result = await messageService.getConversationByParticipants(uuidv4(), uuidv4());
      expect(result).toEqual(conversation);
    });
  });

  describe('sendMessage', () => {
    describe('success', () => {
      it('should return message after create success', async () => {
        const senderProfile = generateProfile();
        const recipientProfile = generateProfile();
        const messageDetail: MessageDetail = {
          messageType: MessageType.TEXT,
          text: 'string',
        };
        const conversation = generateConversation();
        jest.spyOn(followingService, 'get').mockImplementation(async () => { return {} as Following });
        jest.spyOn(messageService, 'getConversationByParticipants').mockImplementation(null);
        jest.spyOn(messageService, 'initConversation').mockImplementation(async () => conversation);
        jest.spyOn(dynamoDBService, 'put').mockImplementation();

        const result: Message = await messageService.sendMessage(senderProfile, recipientProfile, messageDetail);
        expect(result).toMatchObject({
          conversationID: conversation.id,
          messageDetail,
          __typename: 'Message',
        });
      });
    });
    describe('error', () => {
      it('should throw error if send message to blocked conversation', async () => {
        const senderProfile = generateProfile();
        const recipientProfile = generateProfile();
        const messageDetail: MessageDetail = {
          messageType: MessageType.TEXT,
          text: 'string',
        };
        const conversation = generateConversation({ blockedByProfileID: uuidv4() });
        jest.spyOn(messageService, 'getConversationByParticipants').mockImplementation(async () => conversation);
        jest.spyOn(followingService, 'get').mockImplementation(async () => { return {} as Following });

        await expect(messageService.sendMessage(senderProfile, recipientProfile, messageDetail)).rejects.toThrow('You are blocked from this conversation');
      });
    });
  });

  describe('createBroadcastConversation', () => {
    describe('success', () => {
      it('should return conversation after create broadcast', async () => {
        const senderProfile = generateProfile();
        const recipientProfile = generateProfile();
        const broadcastName = 'string';
        const conversation = generateConversation({ conversationType: ConversationType.BROADCAST });

        jest.spyOn(messageService, 'initBroadcastConversation').mockImplementation(async () => conversation);
        jest.spyOn(sqsService, 'sendMessage').mockImplementation();

        const result = await messageService.createBroadcastConversation(senderProfile, [recipientProfile], broadcastName)
        expect(result).toEqual(conversation);
      });
    });
  });

  describe('createBroadcastMessage', () => {
    describe('success', () => {
      it('should return message after create broadcast message success', async () => {
        const conversation = generateConversation({ conversationType: ConversationType.BROADCAST });
        const senderProfile = generateProfile();
        const messageDetail: MessageDetail = {
          messageType: MessageType.TEXT,
          text: 'string',
        };
        jest.spyOn(messageService, 'validateBroadcastConversation').mockImplementation(async () => conversation);
        jest.spyOn(sqsService, 'sendMessage').mockImplementation();
        jest.spyOn(followingService, 'get').mockImplementation(async () => { return {} as Following });
        jest.spyOn(messageService, 'getConversationByParticipants').mockImplementation(null);
        jest.spyOn(messageService, 'initConversation').mockImplementation(async () => conversation);
        jest.spyOn(dynamoDBService, 'put').mockImplementation();

        const result = await messageService.createBroadcastMessage(senderProfile, conversation.id, messageDetail);
        expect(result).toMatchObject({
          conversationID: conversation.id,
          messageDetail,
        })
      });
    });
  });

  describe('sendMessageToConversation', () => {
    describe('success', () => {
      it('should return message after send message to conversation success', async () => {
        const profileConversation = generateProfileConversation();
        const senderProfile = generateProfile();
        const messageDetail: MessageDetail = {
          messageType: MessageType.TEXT,
          text: 'string',
        };
        const message = generateMessage();
        jest.spyOn(messageService, 'getProfileConversation').mockImplementation(async () => profileConversation);
        jest.spyOn(messageService, 'createMessage').mockImplementation(async () => message);

        const result = await messageService.sendMessageToConversation(senderProfile, uuidv4(), messageDetail);
        expect(result).toEqual(message);
      });
    });
  });

  describe('createPatronsInBroadcastConversation', () => {
    describe('success', () => {
      it('should return profile conversation after create success', async () => {
        const conversation = generateConversation();
        const patronIDs = [uuidv4(), uuidv4()];
        const patronProfile = generateProfile({ role: UserRole.PATRON });
        const patronConversations = generateProfileConversations(2);
        jest.spyOn(profileService, 'get').mockImplementation(async () => patronProfile);
        jest.spyOn(messageService, 'getProfileConversation').mockImplementation();
        jest.spyOn(messageService, 'createProfileConversation')
          .mockImplementationOnce(async () => patronConversations[0])
          .mockImplementationOnce(async () => patronConversations[1]);
        jest.spyOn(sqsService, 'sendMessage').mockImplementation();

        const result = await messageService.createPatronsInBroadcastConversation(conversation, patronIDs);
        expect(result).toHaveLength(2);
        expect(result).toEqual(patronConversations);
      });
    });
    describe('error', () => {
      it('should throw invalid patron if patronIDs invalid', async () => {
        const conversation = generateConversation();
        const patronIDs = [uuidv4(), uuidv4()];
        const staffProfile = generateProfile({ role: UserRole.STAFF });
        jest.spyOn(profileService, 'get').mockImplementation(async () => staffProfile);

        await expect(messageService.createPatronsInBroadcastConversation(conversation, patronIDs)).rejects.toThrow('Invalid Patron');
      });
      it('should throw user already exists in conversation if existed profile conversation', async () => {
        const conversation = generateConversation();
        const patronIDs = [uuidv4(), uuidv4()];
        const patronProfile = generateProfile({ role: UserRole.PATRON });
        const profileConversation = generateProfileConversation();
        const user = generateUser();
        jest.spyOn(profileService, 'get').mockImplementation(async () => patronProfile);
        jest.spyOn(messageService, 'getProfileConversation').mockImplementation(async () => profileConversation);
        jest.spyOn(userService, 'get').mockImplementation(async () => user);

        await expect(messageService.createPatronsInBroadcastConversation(conversation, patronIDs)).rejects.toThrow(`${user?.firstName} ${user?.lastName} already exists in this conversation.`);
      });
    });
  });

  describe('updatePatronsInBroadcastConversation', () => {
    describe('success', () => {
      it('should return undefined after update patrons in broadcast', async () => {
        const patrons = generateProfiles(2, { role: UserRole.PATRON });
        const profileConversation = generateProfileConversation();
        const conversation = generateConversation();
        jest.spyOn(messageService, 'listPatronsByBroadcastConversationID').mockImplementation(async () => patrons);
        jest.spyOn(messageService, 'createProfileConversation').mockImplementation(async () => profileConversation);
        jest.spyOn(sqsService, 'sendMessage').mockImplementation();
        jest.spyOn(messageService, 'deleteProfileConversation').mockImplementation();

        const result = await messageService.updatePatronsInBroadcastConversation(conversation, patrons.map(profile => profile.id));
        expect(result).toBe(undefined);
      });
    });
    describe('error', () => {
      it('should throw invalid patron if patronIDs invalid', async () => {
        const patrons = generateProfiles(2, { role: UserRole.PATRON });
        const profileConversation = generateProfileConversation();
        const conversation = generateConversation();
        const staff = generateProfile({ role: UserRole.STAFF });
        jest.spyOn(messageService, 'listPatronsByBroadcastConversationID').mockImplementation(async () => patrons);
        jest.spyOn(profileService, 'get').mockImplementation(async () => staff);
        jest.spyOn(messageService, 'createProfileConversation').mockImplementation(async () => profileConversation);
        jest.spyOn(sqsService, 'sendMessage').mockImplementation();
        jest.spyOn(messageService, 'deleteProfileConversation').mockImplementation();

        expect(messageService.updatePatronsInBroadcastConversation(conversation, [...patrons.map(profile => profile.id), uuidv4()])).rejects.toThrow('Invalid Patron');
      });
    });
  });
});