/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onPushMessageNotification = /* GraphQL */ `
  subscription OnPushMessageNotification($profileID: ID!) {
    onPushMessageNotification(profileID: $profileID) {
      id
      profileID
      conversationID
      conversationType
      messageFrom {
        profileID
        userName
        firstName
        lastName
        avatarUrl
      }
      broadcastName
      messageDetail {
        messageType
        text
        fileUrl
      }
      sentAt
    }
  }
`;
export const onConversationCreated = /* GraphQL */ `
  subscription OnConversationCreated($profileID: ID!) {
    onConversationCreated(profileID: $profileID) {
      id
      profileID
      conversationID
      conversationType
      messageFrom {
        profileID
        userName
        firstName
        lastName
        avatarUrl
      }
      broadcastName
      messageDetail {
        messageType
        text
        fileUrl
      }
      sentAt
    }
  }
`;
export const onProfilePresenceStatus = /* GraphQL */ `
  subscription OnProfilePresenceStatus($recipientProfileID: ID!) {
    onProfilePresenceStatus(recipientProfileID: $recipientProfileID) {
      id
      presenceStatus
      lastOnlineAt
      recipientProfileID
    }
  }
`;
export const onNotifyStaffShiftAlarmBeforeStart = /* GraphQL */ `
  subscription OnNotifyStaffShiftAlarmBeforeStart($recipientProfileID: ID!) {
    onNotifyStaffShiftAlarmBeforeStart(
      recipientProfileID: $recipientProfileID
    ) {
      id
      kind
      recipientProfileID
      shiftID
      shift {
        alert
      }
    }
  }
`;
export const onNotifyPatronShiftAlarmBeforeStart = /* GraphQL */ `
  subscription OnNotifyPatronShiftAlarmBeforeStart($recipientProfileID: ID!) {
    onNotifyPatronShiftAlarmBeforeStart(
      recipientProfileID: $recipientProfileID
    ) {
      id
      kind
      recipientProfileID
      senderProfileID
      shiftID
      shift {
        alert
      }
    }
  }
`;
export const onNotifyRequestSWM = /* GraphQL */ `
  subscription OnNotifyRequestSWM($recipientProfileID: ID!) {
    onNotifyRequestSWM(recipientProfileID: $recipientProfileID) {
      id
      kind
      recipientProfileID
      senderProfileID
    }
  }
`;
export const onNotifyAcceptRequestSWM = /* GraphQL */ `
  subscription OnNotifyAcceptRequestSWM($recipientProfileID: ID!) {
    onNotifyAcceptRequestSWM(recipientProfileID: $recipientProfileID) {
      id
      kind
      recipientProfileID
      senderProfileID
    }
  }
`;
export const onNotifyDirectMessage = /* GraphQL */ `
  subscription OnNotifyDirectMessage($recipientProfileID: ID!) {
    onNotifyDirectMessage(recipientProfileID: $recipientProfileID) {
      id
      kind
      recipientProfileID
      senderProfileID
    }
  }
`;
export const onProfileConversationUpdated = /* GraphQL */ `
  subscription OnProfileConversationUpdated($recipientProfileID: ID!) {
    onProfileConversationUpdated(recipientProfileID: $recipientProfileID) {
      recipientProfileID
      conversationID
      hide
      block
      blockedByProfileID
    }
  }
`;
export const onNotifyLeaveTable = /* GraphQL */ `
  subscription OnNotifyLeaveTable($recipientProfileID: ID!) {
    onNotifyLeaveTable(recipientProfileID: $recipientProfileID) {
      recipientProfileID
      leaveTableProfileID
      totalSittingWith
    }
  }
`;
export const onBlockProfile = /* GraphQL */ `
  subscription OnBlockProfile($recipientProfileID: ID!) {
    onBlockProfile(recipientProfileID: $recipientProfileID) {
      recipientProfileID
      profileID
    }
  }
`;
export const onReportProfile = /* GraphQL */ `
  subscription OnReportProfile($recipientUserID: ID!) {
    onReportProfile(recipientUserID: $recipientUserID) {
      recipientUserID
      profileID
      reportedProfileID
    }
  }
`;
