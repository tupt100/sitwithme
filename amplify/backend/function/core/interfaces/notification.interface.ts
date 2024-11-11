export enum NotificationKind {
  REQUEST_SITWITHME = 'REQUEST_SITWITHME',
  ACCEPT_REQUEST_SITWITHME = 'ACCEPT_REQUEST_SITWITHME',
  PATRON_SHIFT_ALARM_BEFORE_START = 'PATRON_SHIFT_ALARM_BEFORE_START',
  STAFF_SHIFT_ALARM_BEFORE_START = 'STAFF_SHIFT_ALARM_BEFORE_START',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
  NO_SHIFTS_UPCOMING = 'NO_SHIFTS_UPCOMING',
  BIRTHDAY = 'BIRTHDAY',
}

export interface CreateNotificationInput {
  kind: NotificationKind;
  recipientProfileID: string;
  senderProfileID?: string;
  shiftID?: string;
  conversationID?: string;
}

export interface CreateSWMNotificationInput {
  recipientProfileID: string;
  senderProfileID: string;
}

export interface CreateAcceptSWMNotificationInput {
  recipientProfileID: string;
  senderProfileID: string;
}

export interface CreateDirectMessageNotifInput {
  recipientProfileID: string;
  senderProfileID: string;
  conversationID: string;
}

export interface CreateNoShiftsUpcomingNotifInput {
  recipientProfileID: string;
}

export interface Notification {
  id: string;
  __typename: string;
  kind: NotificationKind;
  recipientProfileID: string;
  senderProfileID?: string;
  conversationID?: string;
  shiftID?: string;
  shiftAlert?: number;
  read: boolean;
  createdAt?: string;
  updatedAt?: string;
  eventUpdatedAt?: string;
  readKind?: string;
}

export interface CreateStaffShiftAlarmBeforeStartInput {
  recipientProfileID: string;
  shiftID: string;
  shiftAlert?: number;
  shiftWorkplaceName?: string;
}

export interface CreatePatronShiftAlarmBeforeStartInput {
  recipientProfileID: string;
  senderProfileID: string;
  shiftID: string;
  shiftAlert: number;
  shiftWorkplaceName?: string;
}

export interface NotificationUpdateInput {
  read?: boolean;
  readKind?: string;
}

export interface CreateBirthdayNotificationInput {
  recipientProfileID: string;
  senderProfileID: string;
}