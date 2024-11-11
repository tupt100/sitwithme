export interface SubscriptionMsg {
  hashKey: string; // maybe profileID, userID, videoID, ...
  deliveredAt: string;
  data: object;
  expiredAt: number;
  name?: SubscriptionMsgName;
}

export interface CreateSubscriptionMsgInput {
  hashKey: string; // maybe profileID, userID, videoID, ...
  deliveredAt?: Date;
  data: object;
  expiredAt?: number;
  name: SubscriptionMsgName;
}

export enum SubscriptionMsgName {
  onConversationCreated = 'onConversationCreated',
  onPushMessageNotification = 'onPushMessageNotification',
  onNotifyMessageReaction = 'onNotifyMessageReaction',
  onProfilePresenceStatus = 'onProfilePresenceStatus',
  onNotifyStaffShiftAlarmBeforeStart = 'onNotifyStaffShiftAlarmBeforeStart',
  onNotifyPatronShiftAlarmBeforeStart = 'onNotifyPatronShiftAlarmBeforeStart',
  onNotifyRequestSWM = 'onNotifyRequestSWM',
  onNotifyAcceptRequestSWM = 'onNotifyAcceptRequestSWM',
  onNotifyDirectMessage = 'onNotifyDirectMessage',
  onProfileConversationUpdated = 'onProfileConversationUpdated',
  onNotifyLeaveTable = 'onNotifyLeaveTable',
  onBlockProfile = 'onBlockProfile',
  onReportProfile = 'onReportProfile',
  onNotifyDisableUser = 'onNotifyDisableUser',
  onNotifyProfileDuty = 'onNotifyProfileDuty',
  onNotifyProfileMemberShipUpdated = 'onNotifyProfileMemberShipUpdated',
  onNotifyUserDeleted = 'onNotifyUserDeleted',
  onNotifyChangePrivacy = 'onNotifyChangePrivacy',
}