export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE'
}

export enum SQSBroadcastEventType {
  INIT_BROADCAST,
  SEND_BROADCAST_MESSAGE,
  PATRON_ADDED
}

export enum SQSBroadcastGroupID {
  SEND_BROADCAST_MESSAGE = 'SEND_BROADCAST_MESSAGE'
}

export enum ConversationType {
  NORMAL = 'NORMAL',
  BROADCAST = 'BROADCAST'
}

export enum MessageReactionType {
  HEART = 'HEART'
}

export interface Conversation {
  id: string;
  __typename: string;
  creatorProfileID: string;
  conversationType: ConversationType;
  broadcastName?: string;
  lastMessageAt?: string;
  totalMessage?: number;
  parentConversationID?: string;
  hide?: boolean;
  blockedByProfileID?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileConversation {
  profileID: string;
  conversationID: string;
  __typename: string;
  conversationType: ConversationType;
  lastMessageAt?: string;
  recipientConnection?: RecipientConnection;
  recipientUserID?: string;
  broadcastName?: string;
  deletedAt?: string;
  muteUntil?: string;
  ignore?: boolean;
  totalMessage?: number;
  hide?: boolean;
  blockedByProfileID?: string;
  createdAt?: string;
  updatedAt?: string;
  read?: boolean;
}

export interface Message {
  id: string;
  __typename: string;
  senderProfileID: string;
  conversationID: string;
  messageDetail: MessageDetail;
  sentFromConversationID?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipientConnection {
  userName: string;
  firstName: string;
  lastName: string;
  deleted?: boolean;
  // avatarUrl?: string;
}

export interface MessageDetail {
  messageType: MessageType;
  text?: string;
  fileUrl?: string;
}

export interface CreateMessageInput {
  messageDetail: MessageDetail;
  conversationID: string;
  senderProfileID: string;
  sentFromConversationID?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateConversationInput {
  creatorProfileID: string;
  conversationType: ConversationType;
  broadcastName?: string;
  parentConversationID?: string;
}

export interface CreateProfileConversationInput {
  profileID: string;
  conversationID: string;
  conversationType: ConversationType;
  recipientConnection?: RecipientConnection;
  recipientUserID?: string;
  broadcastName?: string;
}

export interface UpdateConversationInput {
  lastMessageAt?: string;
  hide?: boolean;
  parentConversationID?: string;
}

export interface UpdateProfileConversationInput {
  lastMessageAt?: string;
  read?: boolean;
  hide?: boolean;
  ignore?: boolean;
  blockedByProfileID?: string;
  deletedAt?: string;
}

export interface SyncProfileConversationInput {
  lastMessageAt?: string;
  hide?: boolean;
  ignore?: boolean;
  blockedByProfileIDs?: string[];
}

export interface UpdateBroadcastConversationInput {
  broadcastName?: string;
}

export interface ProfileConversationUpdated {
  recipientProfileID: string;
  conversationID: string;
  hide?: boolean;
  block?: boolean;
  blockedByProfileID?: string;
}

export interface MessageReaction {
  messageID: string;
  profileID: string;
  messageReactionType: MessageReactionType;
  createdAt: string;
}