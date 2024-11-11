/* Amplify Params - DO NOT EDIT
  API_SITWITHME_BLOCKEDPROFILETABLE_ARN
  API_SITWITHME_BLOCKEDPROFILETABLE_NAME
  API_SITWITHME_CONVERSATIONTABLE_ARN
  API_SITWITHME_CONVERSATIONTABLE_NAME
  API_SITWITHME_EXPLOREPROFILETABLE_ARN
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  API_SITWITHME_FOLLOWINGREPORTTABLE_ARN
  API_SITWITHME_FOLLOWINGREPORTTABLE_NAME
  API_SITWITHME_FOLLOWINGTABLE_ARN
  API_SITWITHME_FOLLOWINGTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_MESSAGEREACTIONTABLE_ARN
  API_SITWITHME_MESSAGEREACTIONTABLE_NAME
  API_SITWITHME_MESSAGETABLE_ARN
  API_SITWITHME_MESSAGETABLE_NAME
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_POSTTABLE_ARN
  API_SITWITHME_POSTTABLE_NAME
  API_SITWITHME_PRESENCETABLE_ARN
  API_SITWITHME_PRESENCETABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILEDEVICETOKENTABLE_ARN
  API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME
  API_SITWITHME_PROFILELEADERBOARDTABLE_ARN
  API_SITWITHME_PROFILELEADERBOARDTABLE_NAME
  API_SITWITHME_PROFILERECENTVIEWTABLE_ARN
  API_SITWITHME_PROFILERECENTVIEWTABLE_NAME
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_ARN
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_REPORTEDPROFILETABLE_ARN
  API_SITWITHME_REPORTEDPROFILETABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_TRANSACTIONHISTORYTABLE_ARN
  API_SITWITHME_TRANSACTIONHISTORYTABLE_NAME
  API_SITWITHME_TRANSACTIONTABLE_ARN
  API_SITWITHME_TRANSACTIONTABLE_NAME
  API_SITWITHME_USERCONFIRMATIONTABLE_ARN
  API_SITWITHME_USERCONFIRMATIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  API_SITWITHME_VENUEFAVORITETABLE_ARN
  API_SITWITHME_VENUEFAVORITETABLE_NAME
  API_SITWITHME_VENUEFAVORITEV2TABLE_ARN
  API_SITWITHME_VENUEFAVORITEV2TABLE_NAME
  API_SITWITHME_VENUELEADERBOARDTABLE_ARN
  API_SITWITHME_VENUELEADERBOARDTABLE_NAME
  API_SITWITHME_VIDEOTABLE_ARN
  API_SITWITHME_VIDEOTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { UserRole } from '@swm-core/interfaces/profile.interface';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { User } from '@swm-core/interfaces/user.interface';
import { ExploreProfileService } from '@swm-core/services/explore-profile.service';
import { FollowingReportService } from '@swm-core/services/following-report.service';
import { FollowingService } from '@swm-core/services/following.service';
import { MessageService } from '@swm-core/services/message.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { SNSService } from '@swm-core/services/sns-service';
import { UserCleanupService } from '@swm-core/services/user-cleanup.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const {
  PUSH_NOTIFICATION_TOPIC_ARN
} = process.env;

const exploreProfileService = new ExploreProfileService();
const messageService = new MessageService();
const profileService = new ProfileService();
const followingService = new FollowingService();
const userCleanupService = new UserCleanupService();
const snsService = new SNSService();
const followingReportService = new FollowingReportService();

/**
 * 1. Update explore profile if firstName or lastName has changed
 * 2. Update profile conversation if firstName or lastName or username has changed
 */
const updateRecordHandler = async (record: any) => {
  const oldUser: User = record.old;
  const newUser: User = record.new;

  // soft delete
  if (!oldUser.deleted && newUser.deleted) {
    await userCleanupService.cleanUpUser(newUser);
  } else {
    // update user attributes
    await Promise.all([
      updateExploreProfileConnection(oldUser, newUser),
      updateUserConnection(oldUser, newUser),
      updateProfileConversationConnection(oldUser, newUser),
      updateFollowingConnections(oldUser, newUser),
      updateFollowingReportConnection(oldUser, newUser)
    ]);
  }
};

const removeRecordHandler = async (record: any) => {
  const user: User = record.old;

  try {
    // notify first
    const profiles = await profileService.listProfilesByUserID(user.id);
    for (const profile of profiles) {
      const notificationSNSMessage: NotificationSNSMessage = {
        notificationType: NotificationType.USER_DELETED,
        body: { userID: user.id, profileID: profile.id  }
      };
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
    }


    // clean up
    await userCleanupService.cleanUpUserPermanently(user);
  } catch (e) {
    console.log('Delete User Error: ', e);
  }
};

// 1. Update explore profile if firstName or lastName has changed
const updateExploreProfileConnection = async (oldUser, newUser) => {
  if (await exploreProfileService.canUpdateExploreProfileConnection(oldUser, newUser)) {
    console.log('Start updating explore profile after user change');
    await exploreProfileService.updateExploreProfileConnection({ user: newUser });
  }
};

// 2. Update profile conversation if firstName or lastName or username has changed
const updateProfileConversationConnection = async (oldUser, newUser) => {
  if (
    oldUser.firstName !== newUser.firstName ||
    oldUser.lastName !== newUser.lastName ||
    oldUser.userName !== newUser.userName
  ) {
    console.log('Start updating profile conversation after user change');
    await messageService.updateProfileConversationConnection({ user: newUser });
  }
};

const updateProfileFollowingConnections = async (newUser: User) => {
  const profiles = await profileService.listProfilesByUserID(newUser.id);
  const profileConnection = {
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    userName: newUser.userName,
    deleted: newUser.deleted
  };
  for (const profile of profiles) {
    if (profile.role == UserRole.PATRON) {
      await followingService.updatePatronFollowingConnections({
        patronID: profile.id,
        patronProfileConnection: profileConnection
      });
    } else if (profile.role == UserRole.STAFF) {
      await followingService.updateStaffFollowingConnections({
        staffID: profile.id,
        staffProfileConnection: profileConnection
      });
    }
  }
};

const updateFollowingReportConnection = async (oldUser: User, newUser: User) => {
  if (
    oldUser.firstName !== newUser.firstName ||
    oldUser.lastName !== newUser.lastName ||
    oldUser.userName !== newUser.userName ||
    oldUser.deleted !== newUser.deleted ||
    oldUser.email !== newUser.email
  ) {
    await followingReportService.syncProfileConnectionByUser(newUser);
  }
};

const updateFollowingConnections = async (oldUser: User, newUser: User) => {
  if (
    oldUser.firstName !== newUser.firstName ||
    oldUser.lastName !== newUser.lastName ||
    oldUser.userName !== newUser.userName
  ) {
    console.log('Start updating following after user change');
    await updateProfileFollowingConnections(newUser);
  }
};

const updateUserConnection = async (oldUser: User, newUser: User) => {
  if (
    oldUser.firstName !== newUser.firstName ||
    oldUser.lastName !== newUser.lastName ||
    oldUser.userLocation?.name !== newUser.userLocation?.name ||
    oldUser.userName !== newUser.userName
  ) {
    console.log('Start updating profile after user change');
    await profileService.updateUserConnection(newUser);
  }
};

export const handler = async (event) => {
  console.info('Event: ', JSON.stringify(event, null, 2));
  const errors = [];

  const records = event.Records.map(record => ({
    eventName: record.eventName,
    new: DynamoDB.Converter.unmarshall(record.dynamodb.NewImage),
    old: DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
  }));

  console.info('records: ', JSON.stringify(records, null, 2));

  for (const record of records) {
    try {
      switch (record.eventName) {
        case 'INSERT':
          break;
        case 'MODIFY':
          await updateRecordHandler(record);
          break;
        case 'REMOVE':
          await removeRecordHandler(record);
          break;

        default:
          console.log(`Unexpected record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
