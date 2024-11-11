/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_GRAPHQLAPIENDPOINTOUTPUT
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { NotificationKind } from '@swm-core/interfaces/notification.interface';
import { MessageService } from '@swm-core/services/message.service';
import { NotificationService } from '@swm-core/services/notification.service';
import { ProfileService } from '@swm-core/services/profile.service';

const notificationService = new NotificationService();
const messageService = new MessageService();
const profileService = new ProfileService();

const resolvers = {
  Mutation: {
    markReadNotifications: async (event) => {
      const { role } = event.arguments.input;
      const profile = await profileService.getProfileByUserID(event.identity.claims['custom:id'], role);
      if (!profile) {
        throw new BadRequestException('Profile not found');
      }

      await notificationService.markReadNotificationsByKinds(
        profile.id,
        [
          NotificationKind.ACCEPT_REQUEST_SITWITHME,
          NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START,
          NotificationKind.REQUEST_SITWITHME,
          NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START,
          NotificationKind.DIRECT_MESSAGE,
          NotificationKind.NO_SHIFTS_UPCOMING,
          NotificationKind.BIRTHDAY,
        ]
      );

      return true;
    }
  },

  Query: {
    unreadNotificationsNumber: async (event) => {
      const { role } = event.arguments.input;
      const profile = await profileService.getProfileByUserID(event.identity.claims['custom:id'], role);
      if (!profile) {
        throw new BadRequestException('Profile not found');
      }

      const unreadNotifsNumber = await notificationService.unreadNotificationsNumber(
        profile.id,
        [
          NotificationKind.ACCEPT_REQUEST_SITWITHME,
          NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START,
          NotificationKind.REQUEST_SITWITHME,
          NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START
        ]
      );

      const unreadMessagesNumber = await messageService.unreadMessagesNumber(profile.id);
      return {
        total: unreadNotifsNumber + unreadMessagesNumber,
        messages: unreadMessagesNumber,
        otherNotifications: unreadNotifsNumber
      }
    },

    unreadNotificationsNumberV2: async (event) => {
      const { role } = event.arguments.input;
      const profile = await profileService.getProfileByUserID(event.identity.claims['custom:id'], role);
      if (!profile) {
        throw new BadRequestException('Profile not found');
      }

      const unreadNotifsNumber = await notificationService.unreadNotificationsNumber(
        profile.id,
        [
          NotificationKind.ACCEPT_REQUEST_SITWITHME,
          NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START,
          NotificationKind.REQUEST_SITWITHME,
          NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START,
          NotificationKind.NO_SHIFTS_UPCOMING,
        ]
      );

      const unreadMessagesNumber = await messageService.unreadMessagesNumber(profile.id);
      return {
        total: unreadNotifsNumber + unreadMessagesNumber,
        messages: unreadMessagesNumber,
        otherNotifications: unreadNotifsNumber
      }
    },

    unreadNotificationsNumberV3: async (event) => {
      const { role } = event.arguments.input;
      const profile = await profileService.getProfileByUserID(event.identity.claims['custom:id'], role);
      if (!profile) {
        throw new BadRequestException('Profile not found');
      }

      const unreadNotifsNumber = await notificationService.unreadNotificationsNumber(
        profile.id,
        [
          NotificationKind.ACCEPT_REQUEST_SITWITHME,
          NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START,
          NotificationKind.REQUEST_SITWITHME,
          NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START,
          NotificationKind.NO_SHIFTS_UPCOMING,
          NotificationKind.BIRTHDAY,
        ]
      );

      const unreadMessagesNumber = await messageService.unreadMessagesNumber(profile.id);
      return {
        total: unreadNotifsNumber + unreadMessagesNumber,
        messages: unreadMessagesNumber,
        otherNotifications: unreadNotifsNumber
      }
    }
  }
};

export const handler = async (event) => {
  console.info('Event: ', event);
  const typeHandler = resolvers[event.typeName];
  if (typeHandler) {
    try {
      const resolver = typeHandler[event.fieldName];
      if (resolver) {
        return await resolver(event);
      }
    } catch (e) {
      if (e instanceof PlatformException) {
        const { message, errCode, errors } = e;
        return { error: { message, errCode, errors } };
      } else {
        console.log("ERROR: ", e);
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
