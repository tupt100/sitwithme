import { ConversationType, MessageDetail, MessageReactionType } from "./message.interface";
import { NotificationKind } from "./notification.interface";

export enum NotificationType {
  SEND_MESSAGE = 'sendMessage',
  PROFILE_PRESENCE_STATUS = 'profilePresenceStatus',
  PATRON_SHIFT_ALARM_BEFORE_START = 'notifyPatronShiftAlarmBeforeStart',
  STAFF_SHIFT_ALARM_BEFORE_START = 'notifyStaffShiftAlarmBeforeStart',
  REQUEST_SITWITHME = 'notifyRequestSWM',
  ACCEPT_REQUEST_SITWITHME = 'notifyAcceptRequestSWM',
  DIRECT_MESSAGE = 'notifyDirectMessage',
  PROFILE_CONVERSATION_UPDATED = 'notifyProfileConversationUpdated',
  ON_LEAVE_TABLE = 'notifyLeaveTable',
  BLOCK_PROFILE = 'notifyBlockProfile',
  REPORT_PROFILE = 'notifyReportProfile',
  DISABLE_USER = 'notifyDisableUser',
  SHIFT_START = 'notifyShiftStart',
  SHIFT_END = 'notifyShiftEnd',
  IAP_UPDATED = 'notifyProfileMemberShipUpdated',
  SEND_MESSAGE_REACTION = 'sendMessageReaction',
  USER_DELETED = 'notifyUserDeleted',
  CHANGE_PRIVACY = 'notifyChangePrivacy',
}

export interface NotificationSNSMessage {
  notificationType: NotificationType;
  body: any;
}

export interface MessageFromInput {
  profileID: string;
  userName: string;
  firstName: string;
  lastName: string;
}

export interface MessageNotificationInput {
  id: string;
  profileID: string;
  conversationID: string;
  conversationType: ConversationType;
  messageFrom: MessageFromInput;
  broadcastName?: string;
  messageDetail: MessageDetail;
  sentAt: string;
}

export interface NotifyMessageReactionInput {
  messageID: string;
  profileID: string;
  messageReactionType: MessageReactionType;
  createdAt: string;
  deleted?: boolean;
}

export interface StaffShiftAlarmBeforeStartInput {
  id: string;
  kind: NotificationKind;
  recipientProfileID: string;
  shiftID: string;
  shift: {
    alert?: number;
  }
}

export interface SenderProfile {
  user?: {
    userName?: string;
  },
  avatar?: {
    url?: string;
  }
}

export interface ShiftAlarmDetail {
  alert?: number;
  workplace?: {
    name?: string;
  }
}

export interface PatronShiftAlarmBeforeStartInput {
  id: string;
  kind: NotificationKind;
  recipientProfileID: string;
  senderProfileID: string;
  senderProfile: SenderProfile;
  shiftID: string;
  shift: ShiftAlarmDetail;
}

export interface NotifyRequestSWMInput {
  id: string;
  kind: NotificationKind;
  recipientProfileID: string;
  senderProfileID: string;
  senderProfile: SenderProfile;
}

export interface NotifyAcceptRequestSWMInput {
  id: string;
  kind: NotificationKind;
  recipientProfileID: string;
  senderProfileID: string;
  senderProfile: SenderProfile;
}

export interface NotifyDirectMessageInput {
  id: string;
  kind: NotificationKind;
  recipientProfileID: string;
  senderProfileID: string;
  senderProfile: SenderProfile;
}
