import { v4 as uuidv4 } from 'uuid';
import { Conversation, ConversationType, Message, MessageType, ProfileConversation } from '@swm-core/interfaces/message.interface';

export const generateProfileConversations = (number: number = 1, profileConversation?: Partial<ProfileConversation>) => {
  const profileConversations: ProfileConversation[] = [];
  while (number--) {
    const profileConversationItem = generateProfileConversation(profileConversation, number);
    profileConversations.push(profileConversationItem);
  };
  return profileConversations;
}

export const generateProfileConversation = (profileConversation?: Partial<ProfileConversation>, suffix: number = 0): ProfileConversation => {
  const now = new Date();
  return {
    profileID: uuidv4(),
    conversationID: uuidv4(),
    __typename: 'ProfileConversation',
    conversationType: ConversationType.NORMAL,
    lastMessageAt: now.toISOString(),
    recipientConnection: {
      userName: `userName ${suffix}`,
      firstName: `firstName ${suffix}`,
      lastName: `lastName ${suffix}`
    },
    recipientUserID: uuidv4(),
    broadcastName: `broadcastName ${suffix}`,
    deletedAt: null,
    muteUntil: null,
    ignore: false,
    totalMessage: 0,
    hide: false,
    blockedByProfileID: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    read: false,
    ...profileConversation
  }
}

export const generateConversations = (number: number = 1, conversation?: Partial<Conversation>) => {
  const conversations: Conversation[] = [];
  while (number--) {
    const conversationItem = generateConversation(conversation);
    conversations.push(conversationItem);
  };
  return conversations;
}

export const generateConversation = (conversation?: Partial<Conversation>): Conversation => {
  const now = new Date();
  return {
    id: uuidv4(),
    creatorProfileID: uuidv4(),
    __typename: 'Conversation',
    conversationType: ConversationType.NORMAL,
    lastMessageAt: now.toISOString(),
    broadcastName: 'string',
    hide: false,
    blockedByProfileID: uuidv4(),
    totalMessage: 0,
    parentConversationID: uuidv4(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...conversation
  }
}

export const generateMessages = (number: number = 1, message?: Partial<Message>) => {
  const messages: Message[] = [];
  while (number--) {
    const messageItem = generateMessage(message);
    messages.push(messageItem);
  };
  return messages;
}

export const generateMessage = (message?: Partial<Message>): Message => {
  const now = new Date();
  return {
    id: uuidv4(),
    __typename: 'Message',
    senderProfileID: uuidv4(),
    conversationID: uuidv4(),
    messageDetail: {
      messageType: MessageType.TEXT,
      text: 'string',
    },
    sentFromConversationID: uuidv4(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
}