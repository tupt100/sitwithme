import { Following } from '@swm-core/interfaces/following.interface';
import { Message, MessageDetail, ProfileConversation, ProfileConversationUpdated } from '@swm-core/interfaces/message.interface';
import { Notification } from '@swm-core/interfaces/notification.interface';
import { ProfileSubscription } from '@swm-core/interfaces/profile-subscription.interface';
import { BlockProfileNotificationInput, ChangePrivacyNotificationInput, MemberShip, Profile, ReportProfileNotificationInput, UserRole } from '@swm-core/interfaces/profile.interface';
import { MessageNotificationInput, NotifyAcceptRequestSWMInput, NotifyDirectMessageInput, NotifyMessageReactionInput, NotifyRequestSWMInput, PatronShiftAlarmBeforeStartInput, StaffShiftAlarmBeforeStartInput } from '@swm-core/interfaces/push-notification.interface';
import { Shift } from '@swm-core/interfaces/shift.interface';
import { SubscriptionMsgName } from '@swm-core/interfaces/subscription-msg.interface';
import { User } from '@swm-core/interfaces/user.interface';
import { AppSyncClientService } from '@swm-core/services/appsync-client.service';
import { FollowingService } from '@swm-core/services/following.service';
import { MessageService } from '@swm-core/services/message.service';
import { PhotoService } from '@swm-core/services/photo.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { ShiftService } from '@swm-core/services/shift.service';
import { SubscriptionMsgService } from '@swm-core/services/subscription-msg.service';
import { UserService } from '@swm-core/services/user.service';
import { WorkplaceService } from '@swm-core/services/workplace.service';
import { removeUndefined } from '@swm-core/utils/normalization.util';
import { conversationCreated, notifyAcceptRequestSWMNotification, notifyDirectMessageNotification, notifyRequestSWMNotification, patronShiftAlarmBeforeStartNotification, profilePresenceStatusNotification, pushMessageNotification, staffShiftAlarmBeforeStartNotification, notifyProfileConversationUpdatedNotification, notifyLeaveTableNotification, notifyBlockProfileNotification, notifyReportProfileNotification, notifyDisableUserNotification, notifyProfileDutyNotification, notifyProfileMemberShipUpdatedNotification, notifyMessageReactionNotification, notifyUserDeletedNotification, notifyChangePrivacyNotification } from './mutations';

const {
  API_SITWITHME_GRAPHQLAPIENDPOINTOUTPUT,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN
} = process.env;

const config = {
  url: API_SITWITHME_GRAPHQLAPIENDPOINTOUTPUT,
  accessKeyId: AWS_ACCESS_KEY_ID,
  authType: 'AWS_IAM',
  region: AWS_REGION,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  sessionToken: AWS_SESSION_TOKEN
};

const appSyncClient = new AppSyncClientService(config);
const messageService = new MessageService();
const userService = new UserService();
const profileService = new ProfileService();
const photoService = new PhotoService();
const followingService = new FollowingService();
const shiftService = new ShiftService();
const workplaceService = new WorkplaceService();
const subscriptionMsgService = new SubscriptionMsgService();

const buildMessageNotificationInput = (id: string, conversationID: string, messageFrom: any, messageDetail: MessageDetail, sentAt: string, pc: ProfileConversation): MessageNotificationInput => {
  const { conversationType, broadcastName, profileID } = pc;
  return {
    id,
    profileID,
    conversationID,
    conversationType,
    messageFrom,
    broadcastName,
    messageDetail,
    sentAt
  };
};

export const sendMessage = async (message: Message) => {
  const { id, conversationID, messageDetail, senderProfileID, createdAt: sentAt } = message;
  const senderProfile = await profileService.get(senderProfileID);
  const sender = await userService.get(senderProfile.userID);
  const profileConversations = await messageService.listProfileConversationsByConversationID(conversationID);
  const messageFrom: any = {
    profileID: senderProfileID,
    userName: sender.userName,
    firstName: sender.firstName,
    lastName: sender.lastName
  };

  // avatar
  if (senderProfile.avatarID) {
    const avatar = await photoService.get(senderProfile.avatarID);
    messageFrom.avatarUrl = avatar?.url;
  }

  const tasks: Promise<any>[] = [];

  // 1. trigger conversation created
  for (const pc of profileConversations) {
    const _messages = await messageService.listMessagesByConversationID(conversationID, 2, pc.deletedAt ? new Date(pc.deletedAt) : null);
    if (_messages.length === 1) { // first message
      const input = buildMessageNotificationInput(id, conversationID, messageFrom, messageDetail, sentAt, pc);
      tasks.push(appSyncClient.mutate(conversationCreated, { input }));
      tasks.push(subscriptionMsgService.create({
        hashKey: input.profileID,
        name: SubscriptionMsgName.onConversationCreated,
        data: input,
      }));
    }
  }

  // 2. trigger sending message
  for (const pc of profileConversations) {
    // Stop sending to ignored message thread
    if (!pc.ignore) {
      const input = buildMessageNotificationInput(id, conversationID, messageFrom, messageDetail, sentAt, pc);
      tasks.push(appSyncClient.mutate(pushMessageNotification, { input }));
      tasks.push(subscriptionMsgService.create({
        hashKey: input.profileID,
        name: SubscriptionMsgName.onPushMessageNotification,
        data: input,
      }));
    }
  }

  if (tasks.length) {
    await Promise.all(tasks);
  }
};

export const sendMessageReaction = async (notifyMessageReactionInput: NotifyMessageReactionInput) => {
  const { messageID, profileID, messageReactionType, createdAt: sentAt, deleted } = notifyMessageReactionInput;
  const senderProfile = await profileService.get(profileID);
  const sender = await userService.get(senderProfile.userID);
  const message = await messageService.get(messageID);
  const conversationID = message?.conversationID;
  const profileConversations = await messageService.listProfileConversationsByConversationID(conversationID);
  const messageFrom: any = {
    profileID,
    userName: sender.userName,
    firstName: sender.firstName,
    lastName: sender.lastName
  };

  // avatar
  if (senderProfile.avatarID) {
    const avatar = await photoService.get(senderProfile.avatarID);
    messageFrom.avatarUrl = avatar?.url;
  }

  const tasks: Promise<any>[] = [];

  console.log("@sendMessageReaction - profileConversations: ", profileConversations);
  // 2. trigger sending message
  for (const pc of profileConversations) {
    // Stop sending to ignored message thread
    if (!pc.ignore) {
      const input = {
        messageID,
        profileID: pc.profileID,
        messageReactionType,
        conversationID,
        messageFrom,
        sentAt,
        deleted,
      };
      console.log("@sendMessageReaction - input: ", input, pc);
      tasks.push(appSyncClient.mutate(notifyMessageReactionNotification, { input }));
      tasks.push(subscriptionMsgService.create({
        hashKey: input.profileID,
        name: SubscriptionMsgName.onNotifyMessageReaction,
        data: input,
      }));
    }
  }

  if (tasks.length) {
    await Promise.all(tasks);
  }
};

/**
 * push in-app notification to all profiles that following/follower this profile
 * @param body
 */
export const profilePresenceStatus = async (profile: Profile) => {
  const baseInput = {
    id: profile.id,
    presenceStatus: profile.presenceStatus,
    lastOnlineAt: profile.lastOnlineAt
  };
  const tasks: Promise<any>[] = [];

  if (profile.role === UserRole.PATRON) {
    const followings = await followingService.listFollowingConfirmedByPatronID(profile.id);

    // notify to staff
    for (const following of followings) {
      const input = { ...baseInput, recipientProfileID: following.staffID };
      console.log("@profilePresenceStatus following staff: ", input);
      tasks.push(appSyncClient.mutate(profilePresenceStatusNotification, { input }));
      tasks.push(subscriptionMsgService.create({
        hashKey: input.recipientProfileID,
        name: SubscriptionMsgName.onProfilePresenceStatus,
        data: input,
      }));
    }
  } else if (profile.role === UserRole.STAFF) {
    const followings = await followingService.listFollowingConfirmedByStaffID(profile.id);

    // notify to patron
    for (const following of followings) {
      const input = { ...baseInput, recipientProfileID: following.patronID };
      tasks.push(appSyncClient.mutate(profilePresenceStatusNotification, { input }));
      tasks.push(subscriptionMsgService.create({
        hashKey: input.recipientProfileID,
        name: SubscriptionMsgName.onProfilePresenceStatus,
        data: input,
      }));
    }
  }

  if (tasks.length) {
    console.log("@profilePresenceStatus tasks: ", tasks.length);
    await Promise.all(tasks);
  }
};

export const notifyStaffShiftAlarmBeforeStart = async (notif: Notification) => {
  const { recipientProfileID, shiftID, id, kind } = notif;
  const shift = await shiftService.get(shiftID);
  if (shift) {
    const input: StaffShiftAlarmBeforeStartInput = {
      id,
      kind,
      recipientProfileID,
      shiftID,
      shift: { alert: shift.alert }
    };
    const tasks: Promise<any>[] = [
      appSyncClient.mutate(staffShiftAlarmBeforeStartNotification, { input }),
      subscriptionMsgService.create({
        hashKey: input.recipientProfileID,
        name: SubscriptionMsgName.onNotifyStaffShiftAlarmBeforeStart,
        data: input,
      })
    ];

    await Promise.all(tasks);
  }
};

export const notifyPatronShiftAlarmBeforeStart = async (notif: Notification) => {
  const { recipientProfileID, senderProfileID, shiftID, id, kind } = notif;
  const shift = await shiftService.get(shiftID);
  if (shift) {
    const staffProfile = await profileService.get(shiftID);
    const user = await userService.get(staffProfile.userID);
    const workplace = await workplaceService.get(shift.workplaceID);
    const input: PatronShiftAlarmBeforeStartInput = {
      id,
      kind,
      recipientProfileID,
      senderProfileID,
      senderProfile: { user: { userName: user?.userName } },
      shiftID,
      shift: { alert: 30, workplace: { name: workplace?.name } }
    };
    if (staffProfile.avatarID) {
      const avatar = await photoService.get(staffProfile.avatarID);
      input.senderProfile.avatar = { url: avatar?.url };
    }
    const tasks: Promise<any>[] = [
      appSyncClient.mutate(patronShiftAlarmBeforeStartNotification, { input }),
      subscriptionMsgService.create({
        hashKey: input.recipientProfileID,
        name: SubscriptionMsgName.onNotifyPatronShiftAlarmBeforeStart,
        data: input,
      })
    ];
    await Promise.all(tasks);
  }
};

export const notifyRequestSWM = async (notif: Notification) => {
  const { recipientProfileID, senderProfileID, id, kind } = notif;
  const senderProfile = await profileService.get(senderProfileID);
  if (senderProfile) {
    const user = await userService.get(senderProfileID);
    const input: NotifyRequestSWMInput = {
      id,
      kind,
      recipientProfileID,
      senderProfileID,
      senderProfile: {
        user: { userName: user?.userName }
      }
    };
    if (senderProfile.avatarID) {
      const avatar = await photoService.get(senderProfile.avatarID);
      input.senderProfile.avatar = { url: avatar?.url };
    }
    const tasks: Promise<any>[] = [
      appSyncClient.mutate(notifyRequestSWMNotification, { input }),
      subscriptionMsgService.create({
        hashKey: input.recipientProfileID,
        name: SubscriptionMsgName.onNotifyRequestSWM,
        data: input,
      })
    ];
    await Promise.all(tasks);
  }
};

export const notifyAcceptRequestSWM = async (notif: Notification) => {
  const { recipientProfileID, senderProfileID, id, kind } = notif;
  const senderProfile = await profileService.get(senderProfileID);
  if (senderProfile) {
    const user = await userService.get(senderProfileID);
    const input: NotifyAcceptRequestSWMInput = {
      id,
      kind,
      recipientProfileID,
      senderProfileID,
      senderProfile: {
        user: { userName: user?.userName }
      }
    };
    if (senderProfile.avatarID) {
      const avatar = await photoService.get(senderProfile.avatarID);
      input.senderProfile.avatar = { url: avatar?.url };
    }
    const tasks: Promise<any>[] = [
      appSyncClient.mutate(notifyAcceptRequestSWMNotification, { input }),
      subscriptionMsgService.create({
        hashKey: input.recipientProfileID,
        name: SubscriptionMsgName.onNotifyAcceptRequestSWM,
        data: input,
      })
    ];
    await Promise.all(tasks);
  }
};

export const notifyDirectMessage = async (notif: Notification) => {
  const { recipientProfileID, senderProfileID, id, kind } = notif;
  const senderProfile = await profileService.get(senderProfileID);
  if (senderProfile) {
    const user = await userService.get(senderProfileID);
    const input: NotifyDirectMessageInput = {
      id,
      kind,
      recipientProfileID,
      senderProfileID,
      senderProfile: {
        user: { userName: user?.userName }
      }
    };
    if (senderProfile.avatarID) {
      const avatar = await photoService.get(senderProfile.avatarID);
      input.senderProfile.avatar = { url: avatar?.url };
    }
    const tasks: Promise<any>[] = [
      appSyncClient.mutate(notifyDirectMessageNotification, { input }),
      subscriptionMsgService.create({
        hashKey: input.recipientProfileID,
        name: SubscriptionMsgName.onNotifyDirectMessage,
        data: input,
      })
    ];
    await Promise.all(tasks);
  }
};

/**
 * push in-app notification to all profiles that following/follower this profile
 * @param body
 */
export const notifyProfileConversationUpdated = async (profileConversation: ProfileConversationUpdated) => {
  const input = removeUndefined({
    recipientProfileID: profileConversation.recipientProfileID,
    conversationID: profileConversation.conversationID,
    hide: profileConversation.hide,
    block: profileConversation.block,
    blockedByProfileID: profileConversation.blockedByProfileID,
  });

  // notify to profile in conversation
  console.log("@ProfileConversationUpdated following staff: ", input);
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyProfileConversationUpdatedNotification, { input }),
    subscriptionMsgService.create({
      hashKey: input.recipientProfileID,
      name: SubscriptionMsgName.onProfileConversationUpdated,
      data: input,
    })
  ];
  await Promise.all(tasks);
};

export const notifyLeaveTable = async (following: Following) => {
  const { staffID, patronID } = following;

  const tasks: Promise<any>[] = [];
  // notify to staff
  const staffProfile = await profileService.get(staffID);
  if (staffProfile) {
    const input = {
      recipientProfileID: staffID,
      leaveTableProfileID: patronID,
      totalSittingWith: staffProfile.sittingWithTotal
    };
    tasks.push(appSyncClient.mutate(notifyLeaveTableNotification, { input }));
    tasks.push(subscriptionMsgService.create({
      hashKey: input.recipientProfileID,
      name: SubscriptionMsgName.onNotifyLeaveTable,
      data: input,
    }));
  }


  // notify to patron
  const patronProfile = await profileService.get(patronID);
  if (patronProfile) {
    const input = {
      recipientProfileID: patronID,
      leaveTableProfileID: staffID,
      totalSittingWith: patronProfile.sittingWithTotal
    };
    tasks.push(appSyncClient.mutate(notifyLeaveTableNotification, { input }));
    tasks.push(subscriptionMsgService.create({
      hashKey: input.recipientProfileID,
      name: SubscriptionMsgName.onNotifyLeaveTable,
      data: input,
    }));
  }

  // exec tasks
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
};

/**
 * push in-app notification to profile is blocked from this profile
 * @param body
 */
export const notifyBlockProfile = async (input: BlockProfileNotificationInput) => {
  console.log("@notifyBlockProfileNotification : ", input);
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyBlockProfileNotification, { input }),
    subscriptionMsgService.create({
      hashKey: input.recipientProfileID,
      name: SubscriptionMsgName.onBlockProfile,
      data: input,
    })
  ];
  await Promise.all(tasks);
};

/**
 * push in-app report notification to admin
 * @param body
 */
export const notifyReportProfile = async (input: ReportProfileNotificationInput) => {
  console.log("@notifyReportProfileNotification : ", input);
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyReportProfileNotification, { input }),
    subscriptionMsgService.create({
      hashKey: input.recipientUserID,
      name: SubscriptionMsgName.onReportProfile,
      data: input,
    })
  ];
  await Promise.all(tasks);
};

export const notifyDisableUser = async (user: User) => {
  console.log('[notifyDisableUser] notify disable', user.id);
  const input = { userID: user.id };
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyDisableUserNotification, { input }),
    subscriptionMsgService.create({
      hashKey: input.userID,
      name: SubscriptionMsgName.onNotifyDisableUser,
      data: input,
    })
  ];
  await Promise.all(tasks);
};

export const notifyShiftStart = async (shift: Shift) => {
  console.log('[notifyShiftStart]', shift.id);
  const input = {
    profileID: shift.profileID,
    workplaceID: shift.workplaceID,
    jobID: shift.jobID,
    duty: true
  };
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyProfileDutyNotification, { input }),
    subscriptionMsgService.create({
      hashKey: 'ALL',
      name: SubscriptionMsgName.onNotifyProfileDuty,
      data: input,
    })
  ];
  await Promise.all(tasks);
};

export const notifyShiftEnd = async (shift: Shift) => {
  console.log('[notifyShiftEnd]', shift.id);
  const input = {
    profileID: shift.profileID,
    workplaceID: shift.workplaceID,
    jobID: shift.jobID,
    duty: false
  };
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyProfileDutyNotification, { input }),
    subscriptionMsgService.create({
      hashKey: 'ALL',
      name: SubscriptionMsgName.onNotifyProfileDuty,
      data: input,
    })
  ];
  await Promise.all(tasks);
};

export const notifyProfileMemberShipUpdated = async (profileSubscription: ProfileSubscription) => {
  console.log('[notifyProfileMemberShipUpdated]', profileSubscription.id);
  const profile = await profileService.get(profileSubscription.profileID);
  const input = {
    profileID: profileSubscription.profileID,
    memberShip: profile.memberShip || MemberShip.NONE,
    expiredAt: profileSubscription.expiredAt,
    appleProductID: profileSubscription.appleProductID,
  };

  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyProfileMemberShipUpdatedNotification, { input }),
    subscriptionMsgService.create({
      hashKey: input.profileID,
      name: SubscriptionMsgName.onNotifyProfileMemberShipUpdated,
      data: input,
    })
  ];
  await Promise.all(tasks);
};

export const notifyUserDeleted = async (body: { userID: string, profileID: string }) => {
  console.log('[notifyUserDeleted]', body.userID);
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyUserDeletedNotification, { input: body }),
    subscriptionMsgService.create({
      hashKey: 'ALL',
      name: SubscriptionMsgName.onNotifyUserDeleted,
      data: body
    })
  ];

  await Promise.all(tasks);
};

export const notifyChangePrivacy = async (input: ChangePrivacyNotificationInput) => {
  console.log("@notifyChangePrivacyNotification : ", input);
  const tasks: Promise<any>[] = [
    appSyncClient.mutate(notifyChangePrivacyNotification, { input }),
    subscriptionMsgService.create({
      hashKey: 'ALL',
      name: SubscriptionMsgName.onNotifyChangePrivacy,
      data: input,
    })
  ];
  await Promise.all(tasks);
};
