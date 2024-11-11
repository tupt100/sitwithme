export const pushMessageNotification = `
  mutation pushMessageNotification($input: MessageNotificationInput!) {
    pushMessageNotification(input: $input) {
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

export const conversationCreated = `
  mutation conversationCreated($input: MessageNotificationInput!) {
    conversationCreated(input: $input) {
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

export const profilePresenceStatusNotification = `
  mutation profilePresenceStatus($input: ProfilePresenceNotificationInput!) {
    profilePresenceStatus(input: $input) {
      id
      presenceStatus
      lastOnlineAt
      recipientProfileID
    }
  }
`;

export const staffShiftAlarmBeforeStartNotification = `
  mutation notifyStaffShiftAlarmBeforeStart($input: StaffShiftAlarmBeforeStartInput!) {
    notifyStaffShiftAlarmBeforeStart(input: $input) {
      id
      kind
      shiftID
      shift {
        alert
      }
      recipientProfileID
    }
  }
`;

export const patronShiftAlarmBeforeStartNotification = `
  mutation notifyPatronShiftAlarmBeforeStart($input: PatronShiftAlarmBeforeStartInput!) {
    notifyPatronShiftAlarmBeforeStart(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
      senderProfile {
        avatar {
          url
        }
        user {
          userName
        }
      }
      shiftID
      shift {
        alert
        workplace {
          name
        }
      }
    }
  }
`;

export const notifyRequestSWMNotification = `
  mutation notifyRequestSWM($input: NotifyRequestSWMInput!) {
    notifyRequestSWM(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
      senderProfile {
        user {
          userName
        }
        avatar {
          url
        }
      }
    }
  }
`;

export const notifyAcceptRequestSWMNotification = `
  mutation notifyAcceptRequestSWM($input: NotifyAcceptRequestSWMInput!) {
    notifyAcceptRequestSWM(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
      senderProfile {
        user {
          userName
        }
        avatar {
          url
        }
      }
    }
  }
`;

export const notifyDirectMessageNotification = `
  mutation notifyDirectMessage($input: NotifyDirectMessageInput!) {
    notifyDirectMessage(input: $input) {
      id
      kind
      recipientProfileID
      senderProfileID
      senderProfile {
        user {
          userName
        }
        avatar {
          url
        }
      }
    }
  }
`;

export const notifyProfileConversationUpdatedNotification = `
  mutation notifyProfileConversationUpdated($input: ProfileConversationUpdatedInput!) {
    notifyProfileConversationUpdated(input: $input) {
      recipientProfileID
      conversationID
      hide
      block
      blockedByProfileID
    }
  }
`;

export const notifyLeaveTableNotification = `
  mutation notifyLeaveTable($input: NotifyLeaveTableInput!) {
    notifyLeaveTable(input: $input) {
      recipientProfileID
      leaveTableProfileID
      totalSittingWith
    }
  }
`;

export const notifyBlockProfileNotification = `
  mutation notifyBlockProfile($input: NotifyBlockProfileInput!) {
    notifyBlockProfile(input: $input) {
      recipientProfileID
      profileID
    }
  }
`;

export const notifyReportProfileNotification = `
  mutation notifyReportProfile($input: NotifyReportProfileInput!) {
    notifyReportProfile(input: $input) {
      recipientUserID
      profileID
      reportedProfileID
    }
  }
`;

export const notifyDisableUserNotification = `
  mutation notifyDisableUser($input: NotifyDisableUserInput!) {
    notifyDisableUser(input: $input) {
      userID
    }
  }
`;

export const notifyProfileDutyNotification = `
  mutation notifyProfileDuty($input: NotifyProfileDutyInput!) {
    notifyProfileDuty(input: $input) {
      profileID
      workplaceID
      jobID
      duty
    }
  }
`;

export const notifyProfileMemberShipUpdatedNotification = `
  mutation notifyProfileMemberShipUpdated($input: NotifyProfileMemberShipUpdated!) {
    notifyProfileMemberShipUpdated(input: $input) {
      profileID
      memberShip
      expiredAt
      appleProductID
    }
  }
`;

export const notifyMessageReactionNotification = `
  mutation notifyMessageReaction($input: NotifyMessageReactionInput!) {
    notifyMessageReaction(input: $input) {
      messageID
      profileID
      messageReactionType
      conversationID
      messageFrom {
        profileID
        userName
        firstName
        lastName
        avatarUrl
      }
      sentAt
      deleted
    }
  }
`;

export const notifyUserDeletedNotification = `
  mutation notifyUserDeleted($input: NotifyUserDeletedInput!) {
    notifyUserDeleted(input: $input) {
      userID
      profileID
    }
  }
`;

export const notifyChangePrivacyNotification = `
  mutation notifyChangePrivacy($input: NotifyChangePrivacyInput!) {
    notifyChangePrivacy(input: $input) {
      profileID
      privacy
      showInExplore
    }
  }
`;