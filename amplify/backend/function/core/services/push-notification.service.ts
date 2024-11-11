import { AlarmConst } from '@swm-core/constants/alarm.const';
import { ConversationType } from '@swm-core/interfaces/message.interface';
import { Notification, NotificationKind } from "@swm-core/interfaces/notification.interface";
import { UserRole } from '@swm-core/interfaces/profile.interface';
import { minToEventText } from '@swm-core/utils/date.util';
import { MessageService } from './message.service';
import { NotificationService } from './notification.service';
import { PhotoService } from './photo.service';
import { PinpointService } from "./pinpoint.service";
import { ProfileDeviceTokenService } from './profile-devicetoken.service';
import { ProfileService } from "./profile.service";
import { ShiftService } from "./shift.service";
import { UserService } from "./user.service";
import { WorkplaceService } from "./workplace.service";

const {
  PINPOINT_APP_ID
} = process.env;

const shiftService = new ShiftService();
const profileService = new ProfileService();
const profileDeviceTokenService = new ProfileDeviceTokenService();
const pinpointService = new PinpointService(PINPOINT_APP_ID);
const workplaceService = new WorkplaceService();
const userService = new UserService();
const messageService = new MessageService();
const notificationService = new NotificationService();
const photoService = new PhotoService();

export class PushNotificationService {

  async getProfileBadge(profileID: string): Promise<number> {
    const unreadMessagesNumber = await messageService.unreadMessagesNumber(profileID);
    const unreadNotifsNumber = await notificationService.unreadNotificationsNumber(profileID, [
      NotificationKind.ACCEPT_REQUEST_SITWITHME,
      NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START,
      NotificationKind.REQUEST_SITWITHME,
      NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START,
      NotificationKind.NO_SHIFTS_UPCOMING,
      NotificationKind.BIRTHDAY,
    ]);
    return unreadMessagesNumber + unreadNotifsNumber;
  }

  async getUserBadge(userID: string): Promise<number> {
    const profiles = await profileService.listProfilesByUserID(userID);
    let unreadMsg = 0;
    for (const profile of profiles) {
      unreadMsg += await this.getProfileBadge(profile.id);
    }
    return unreadMsg;
  }

  async pushStaffShiftAlarmBeforeStart(notif: Notification) {
    const { recipientProfileID, shiftID, kind } = notif;
    const shift = await shiftService.get(shiftID);
    if (shift) {
      const profile = await profileService.get(recipientProfileID);
      if (profile) {
        if (notificationService.canPushNotif(profile, notif.kind)) {
          console.log("[pushStaffShiftAlarmBeforeStart] Push notif out app");
          // push FCM notification
          const profileDeviceTokens = await profileDeviceTokenService.listProfileDeviceToken(profile.id);
          const title = 'Shift Alert';
          const message = shift.alert === 0 ? 'Your shift starts now.' : `Your shift starts in ${minToEventText(shift.alert)}.`;
          const badge = await this.getUserBadge(profile.userID);
          if (profileDeviceTokens.length) {
            await Promise.all(profileDeviceTokens.map((t) => {
              const deviceToken = t.deviceToken;
              return pinpointService.sendMessages(deviceToken, title, message, { shiftID: shift.id, staffID: shift.profileID, kind }, badge);
            }));
          }
        }
      }
    }
  }

  async pushPatronShiftAlarmBeforeStart(notif: Notification) {
    const { recipientProfileID, shiftID, kind } = notif;
    const shift = await shiftService.get(shiftID);
    if (shift) {
      const patronProfile = await profileService.get(recipientProfileID);
      if (patronProfile) {
        if (notificationService.canPushNotif(patronProfile, notif.kind)) {
          console.log("[pushPatronShiftAlarmBeforeStart] Push notif out app");
          // push FCM notification
          const profileDeviceTokens = await profileDeviceTokenService.listProfileDeviceToken(patronProfile.id);
          if (profileDeviceTokens.length) {
            const staffProfile = await profileService.get(shift.profileID);
            const user = await userService.get(staffProfile.userID);
            let avatarUrl: string = null;
            if (staffProfile.avatarID) {
              const photo = await photoService.get(staffProfile.avatarID);
              avatarUrl = photo?.url;
            }
            const title = 'Shift Alert';
            const workplace = await workplaceService.get(shift.workplaceID);
            const workAt = workplace ? `at ${workplace.name} ` : '';
            const message = `${user.userName}'s shift ${workAt}starts in ${minToEventText(AlarmConst.PATRON_SHIFT_ALARM_BEFORE_START)}.`;
            const badge = await this.getUserBadge(patronProfile.userID);

            await Promise.all(profileDeviceTokens.map((t) => {
              const deviceToken = t.deviceToken;
              return pinpointService.sendMessages(deviceToken, title, message, { shiftID: shift.id, staffID: staffProfile.id, avatarUrl, kind }, badge);
            }));
          }
        }

        // if (patronProfile.presenceStatus === PresenceStatus.ON) {
        //   console.log("[pushPatronShiftAlarmBeforeStart] Push in app");
        //   // push in-app via subscription
        //   const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.PATRON_SHIFT_ALARM_BEFORE_START, body: notif };
        //   await snsService.publish({
        //     Message: JSON.stringify(notificationSNSMessage),
        //     TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
        //   });
        // } else {
        //   console.log("[pushPatronShiftAlarmBeforeStart] Push notif out app");
        //   // push FCM notification
        //   const userDeviceTokens = await userDeviceTokenService.listUserDeviceTokens(patronProfile.userID);
        //   if (userDeviceTokens.length) {
        //     const staffProfile = await profileService.get(shift.profileID);
        //     const user = await userService.get(staffProfile.userID);
        //     const title = 'Shift Alert';
        //     const workplace = await workplaceService.get(shift.workplaceID);
        //     const workAt = workplace ? `at ${workplace.name} ` : '';
        //     const message = `${user.userName}'s shift ${workAt}starts in 30min.`;

        //     await Promise.all(userDeviceTokens.map((t) => {
        //       const deviceToken = t.deviceToken;
        //       return pinpointService.sendMessages(deviceToken, title, message, { shiftID: shift.id, staffID: staffProfile.id, kind });
        //     }));
        //   }
        // }
      }
    }
  }

  async pushRequestSWM(notif: Notification) {
    const { recipientProfileID, senderProfileID, kind } = notif;

    console.log("[pushRequestSWM] Push notif out app");
    // push FCM notification
    // recipientProfile can be staff or patron
    const recipientProfile = await profileService.get(recipientProfileID);
    if (recipientProfile) {
      if (notificationService.canPushNotif(recipientProfile, notif.kind)) {
        const profileDeviceTokens = await profileDeviceTokenService.listProfileDeviceToken(recipientProfile.id);
        if (profileDeviceTokens.length) {
          // senderProfile can be staff or patron
          const senderProfile = await profileService.get(senderProfileID);
          const user = await userService.get(senderProfile.userID);
          let avatarUrl: string = null;
          if (senderProfile.avatarID) {
            const photo = await photoService.get(senderProfile.avatarID);
            avatarUrl = photo?.url;
          }
          const title = 'Sit with me';
          const message = `${user.userName} wants to sit with you.`;
          const badge = await this.getUserBadge(recipientProfile.userID);

          let patronID: string, staffID: string;
          if (recipientProfile.role === UserRole.STAFF) {
            staffID = recipientProfileID;
            patronID = senderProfileID;
          } else {
            staffID = senderProfileID;
            patronID = recipientProfileID;
          }

          await Promise.all(profileDeviceTokens.map((t) => {
            console.log("[pushRequestSWM] Push notif to ", t.deviceToken);
            const deviceToken = t.deviceToken;
            return pinpointService.sendMessages(
              deviceToken,
              title,
              message,
              { kind, notificationID: notif.id, patronID, staffID, avatarUrl },
              badge
            );
          }));
        }
      }
    }

    // push in-app via subscription
    // console.log("[pushRequestSWM] Push notif in app");
    // const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.REQUEST_SITWITHME, body: notif };
    // await snsService.publish({
    //   Message: JSON.stringify(notificationSNSMessage),
    //   TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
    // });
  }

  async pushAcceptSWM(notif: Notification) {
    const { recipientProfileID, senderProfileID, kind } = notif;

    console.log("[pushAcceptSWM] Push notif out app");
    // push FCM notification
    // recipientProfile can be staff or patron
    const recipientProfile = await profileService.get(recipientProfileID);
    if (recipientProfile) {
      if (notificationService.canPushNotif(recipientProfile, notif.kind)) {
        const profileDeviceTokens = await profileDeviceTokenService.listProfileDeviceToken(recipientProfile.id);
        if (profileDeviceTokens.length) {
          // senderProfile can be staff or patron
          const senderProfile = await profileService.get(senderProfileID);
          const user = await userService.get(senderProfile.userID);
          let avatarUrl: string = null;
          if (senderProfile.avatarID) {
            const photo = await photoService.get(senderProfile.avatarID);
            avatarUrl = photo?.url;
          }
          const title = 'Sit with me';
          const message = `You are now sitting with ${user.userName}`;
          const badge = await this.getUserBadge(recipientProfile.userID);

          let patronID: string, staffID: string;
          if (recipientProfile.role === UserRole.STAFF) {
            staffID = recipientProfileID;
            patronID = senderProfileID;
          } else {
            staffID = senderProfileID;
            patronID = recipientProfileID;
          }

          await Promise.all(profileDeviceTokens.map((t) => {
            console.log("[pushAcceptSWM] Push notif to ", t.deviceToken);
            const deviceToken = t.deviceToken;
            return pinpointService.sendMessages(
              deviceToken,
              title,
              message,
              { kind, notificationID: notif.id, staffID, patronID, avatarUrl },
              badge
            );
          }));
        }
      }
    }



    // push in-app via subscription
    // console.log("[pushAcceptSWM] Push notif in app");
    // const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.ACCEPT_REQUEST_SITWITHME, body: notif };
    // await snsService.publish({
    //   Message: JSON.stringify(notificationSNSMessage),
    //   TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
    // });
  }

  async pushDirectMessage(notif: Notification) {
    const { recipientProfileID, conversationID, senderProfileID, kind } = notif;
    const profile = await profileService.get(recipientProfileID);
    if (profile) {
      const profileConversation = await messageService.getProfileConversation(profile.id, conversationID, ConversationType.NORMAL);
      // Stop sending push message in case: muted, ignored
      if (notificationService.canPushNotif(profile, notif.kind) && profileConversation && messageService.canPushNotif(profileConversation)) {
        // push FCM notification
        const senderProfile = await profileService.get(senderProfileID);
        const user = await userService.get(senderProfile.userID);
        let avatarUrl: string = null;
        if (senderProfile.avatarID) {
          const photo = await photoService.get(senderProfile.avatarID);
          avatarUrl = photo?.url;
        }
        const profileDeviceTokens = await profileDeviceTokenService.listProfileDeviceToken(profile.id);
        const title = 'New Message';
        const message = `${user.userName} messaged you.`;
        const badge = await this.getUserBadge(profile.userID);

        if (profileDeviceTokens.length) {
          await Promise.all(profileDeviceTokens.map((t) => {
            const deviceToken = t.deviceToken;
            return pinpointService.sendMessages(deviceToken, title, message, { conversationID, kind, senderProfileID, avatarUrl, recipientProfileID }, badge);
          }));
        }
      }

      // if (profile.presenceStatus === PresenceStatus.ON) {
      //   console.log("[pushDirectMessage] Push in app");
      //   const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.DIRECT_MESSAGE, body: notif };
      //   await snsService.publish({
      //     Message: JSON.stringify(notificationSNSMessage),
      //     TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      //   });
      // } else {
      //   console.log("[pushDirectMessage] Push out app");
      //   // push FCM notification
      //   const senderProfile = await profileService.get(senderProfileID);
      //   const user = await userService.get(senderProfile.userID);
      //   const userDeviceTokens = await userDeviceTokenService.listUserDeviceTokens(profile.userID);
      //   const title = 'New Message';
      //   const message = `${user.userName} messaged you.`;
      //   if (userDeviceTokens.length) {
      //     await Promise.all(userDeviceTokens.map((t) => {
      //       const deviceToken = t.deviceToken;
      //       return pinpointService.sendMessages(deviceToken, title, message, { conversationID, kind, senderProfileID, recipientProfileID });
      //     }));
      //   }
      // }
    }

  }

  async pushNoShiftsUpcoming(notif: Notification) {
    const { recipientProfileID, kind } = notif;

    console.log("[pushNoShiftsUpcoming] Push notif out app");
    // push FCM notification
    const staffProfile = await profileService.get(recipientProfileID);
    if (staffProfile) {
      if (notificationService.canPushNotif(staffProfile, notif.kind)) {
        const profileDeviceTokens = await profileDeviceTokenService.listProfileDeviceToken(staffProfile.id);
        if (profileDeviceTokens.length) {
          const title = 'Shift Alert';
          const message = 'No upcoming shift scheduled! Please schedule more shifts so you don’t get taken off the explore page.';
          const badge = await this.getUserBadge(staffProfile.userID);
          await Promise.all(profileDeviceTokens.map((t) => {
            console.log("[pushNoShiftsUpcoming] Push notif to ", t.deviceToken);
            const deviceToken = t.deviceToken;
            return pinpointService.sendMessages(
              deviceToken,
              title,
              message,
              { kind, notificationID: notif.id, staffID: staffProfile.id },
              badge
            );
          }));
        }
      }
    }
  }

  async pushBirthday(notif: Notification) {
    const { recipientProfileID, kind, senderProfileID } = notif;

    console.log("[pushBirthday] Push notif out app");
    // push FCM notification
    const profile = await profileService.get(recipientProfileID);
    const senderProfile = await profileService.get(senderProfileID);
    if (profile) {
      if (notificationService.canPushNotif(profile, notif.kind)) {
        const profileDeviceTokens = await profileDeviceTokenService.listProfileDeviceToken(profile.id);
        if (profileDeviceTokens.length) {
          const title = 'Birthday Notification';
          const message = `It's ${senderProfile.userConnection.fullName}'s birthday today. Send them a message.`;
          const badge = await this.getUserBadge(profile.userID);
          await Promise.all(profileDeviceTokens.map((t) => {
            console.log("[pushBirthday] Push notif to ", t.deviceToken);
            const deviceToken = t.deviceToken;
            return pinpointService.sendMessages(
              deviceToken,
              title,
              message,
              { kind, notificationID: notif.id, recipientProfileID, senderProfileID },
              badge
            );
          }));
        }
      }
    }
  }
}
