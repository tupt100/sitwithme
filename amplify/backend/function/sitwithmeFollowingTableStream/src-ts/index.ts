/* Amplify Params - DO NOT EDIT
  API_SITWITHME_CONVERSATIONTABLE_ARN
  API_SITWITHME_CONVERSATIONTABLE_NAME
  API_SITWITHME_FOLLOWINGREPORTTABLE_ARN
  API_SITWITHME_FOLLOWINGREPORTTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILELEADERBOARDTABLE_ARN
  API_SITWITHME_PROFILELEADERBOARDTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_STAFFLEADERBOARDTABLE_ARN
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { Following } from '@swm-core/interfaces/following.interface';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { FollowingReportService } from '@swm-core/services/following-report.service';
import { FollowingService } from '@swm-core/services/following.service';
import { MessageService } from '@swm-core/services/message.service';
import { NotificationService } from '@swm-core/services/notification.service';
import { ProfileLeaderboardService } from '@swm-core/services/profile-leaderboard.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { SNSService } from '@swm-core/services/sns-service';
import { StaffLeaderboardService } from '@swm-core/services/staff-leaderboard.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const {
  PUSH_NOTIFICATION_TOPIC_ARN
} = process.env;

const staffLeaderboardService = new StaffLeaderboardService();
const profileLeaderboardService = new ProfileLeaderboardService();
const notificationService = new NotificationService();
const messageService = new MessageService();
const profileService = new ProfileService();
const snsService = new SNSService();
const followingService = new FollowingService();
const followingReportService = new FollowingReportService();

const insertRecordHandler = async (record: any) => {
  const { staffID, patronID, confirmedAt, requestedBy } = record.new as Following;
  if (confirmedAt) {
    await Promise.all([
      staffLeaderboardService.updateConnectionCount(staffID, 1),
      profileLeaderboardService.updateConnectionCount(staffID, 1),
      profileLeaderboardService.updateConnectionCount(patronID, 1),
      profileService.updateSittingWithTotal(staffID, 1),
      profileService.updateSittingWithTotal(patronID, 1),
      messageService.syncConversationFromFollowingTable(patronID, staffID, { hide: false }),
      followingService.addFollowingProfileIDsToProfile(staffID, patronID),
      followingService.addFollowingProfileIDsToProfile(patronID, staffID),
      followingReportService.create({ staffID, patronID, confirmedAt: new Date(confirmedAt) })
    ]);
  } else {
    // create request sit with me notification
    let opts;
    if (requestedBy === staffID) {
      opts = {
        senderProfileID: staffID,
        recipientProfileID: patronID
      };
    } else if (requestedBy === patronID) {
      opts = {
        senderProfileID: patronID,
        recipientProfileID: staffID
      };
    }

    if (opts) {
      await notificationService.createRequestSWMN(opts);
    } else {
      console.log('ERROR when acceptSWM: requestedBy not found');
    }
  }
};

const modifyRecordHandler = async (record: any) => {
  const oldRow: Following = record.old;
  const newRow: Following = record.new;

  if (!oldRow.confirmedAt && newRow.confirmedAt) {
    const { patronID, staffID } = newRow;
    await Promise.all([
      staffLeaderboardService.updateConnectionCount(staffID, 1),
      profileLeaderboardService.updateConnectionCount(staffID, 1),
      profileLeaderboardService.updateConnectionCount(patronID, 1),
      profileService.updateSittingWithTotal(staffID, 1),
      profileService.updateSittingWithTotal(patronID, 1),
      messageService.syncConversationFromFollowingTable(patronID, staffID, { hide: false }),
      followingService.addFollowingProfileIDsToProfile(staffID, patronID),
      followingService.addFollowingProfileIDsToProfile(patronID, staffID),
      followingReportService.create({ staffID, patronID, confirmedAt: new Date(newRow.confirmedAt) })
    ]);

    // create accept sit with me notification
    let opts;
    if (newRow.requestedBy === staffID) {
      opts = {
        senderProfileID: patronID,
        recipientProfileID: staffID
      };
    } else if (newRow.requestedBy === patronID) {
      opts = {
        senderProfileID: staffID,
        recipientProfileID: patronID
      };
    }

    if (opts) {
      await notificationService.createAcceptSWMN(opts);

      // remove previous request SWM notification
      const notification = await notificationService.getRequestSWMN(patronID, staffID);
      if (notification) {
        await notificationService.delete(notification.id);
      }
    } else {
      console.log('ERROR when acceptSWM: requestedBy not found');
    }

  } else if (oldRow.confirmedAt && !newRow.confirmedAt) {
    const { staffID, patronID } = newRow;
    await Promise.all([
      staffLeaderboardService.updateConnectionCount(staffID, -1),
      profileLeaderboardService.updateConnectionCount(staffID, -1),
      profileLeaderboardService.updateConnectionCount(patronID, -1),
      profileService.updateSittingWithTotal(staffID, -1),
      profileService.updateSittingWithTotal(patronID, -1),
      messageService.syncConversationFromFollowingTable(patronID, staffID, { hide: true }),
      // remove this profile out of all broadcast conversation contain it.
      messageService.deletePatronInAllBroadcastsByStaffID(staffID, patronID),
      followingService.removeFollowingProfileIDsFromProfile(staffID, patronID),
      followingService.removeFollowingProfileIDsFromProfile(patronID, staffID),
      followingReportService.create({ staffID, patronID, leftAt: new Date() })
    ]);

    // on leave table notify
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.ON_LEAVE_TABLE, body: record.old };
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
    } catch (e) {
      console.log('ERROR when notifyLeaveTable - push notification: ', e);
    }
  }
};

const removeRecordHandler = async (record: any) => {
  const { staffID, confirmedAt, patronID, requestedBy } = record.old as Following;
  if (confirmedAt) {
    await Promise.all([
      staffLeaderboardService.updateConnectionCount(staffID, -1),
      profileLeaderboardService.updateConnectionCount(staffID, -1),
      profileLeaderboardService.updateConnectionCount(patronID, -1),
      profileService.updateSittingWithTotal(staffID, -1),
      profileService.updateSittingWithTotal(patronID, -1),
      // remove this profile out of all broadcast conversation contain it.
      messageService.deletePatronInAllBroadcastsByStaffID(staffID, patronID),
      followingService.removeFollowingProfileIDsFromProfile(staffID, patronID),
      followingService.removeFollowingProfileIDsFromProfile(patronID, staffID),
      followingReportService.create({ staffID, patronID, leftAt: new Date() })
    ]);

    // on leave table notify
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.ON_LEAVE_TABLE, body: record.old };
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
    } catch (e) {
      console.log('ERROR when notifyLeaveTable - push notification: ', e);
    }
  }

  await Promise.all([
    removeNotification(patronID, staffID, requestedBy),
    messageService.syncConversationFromFollowingTable(patronID, staffID, { hide: true }),
  ]);
};

const removeNotification = async (patronID: string, staffID: string, requestedBy: string) => {
  // remove previous SWMs
  let requestedProfileID: string, otherProfileID: string;
  if (requestedBy === staffID) {
    requestedProfileID = staffID;
    otherProfileID = patronID;
  } else {
    requestedProfileID = patronID;
    otherProfileID = staffID;
  }

  // remove notif
  const requestNotif = await notificationService.getRequestSWMN(requestedProfileID, otherProfileID);
  if (requestNotif) {
    await notificationService.delete(requestNotif.id);
  }
  const acceptNotif = await notificationService.getAcceptSWMN(otherProfileID, requestedProfileID);
  if (acceptNotif) {
    await notificationService.delete(acceptNotif.id);
  }
}

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
          await insertRecordHandler(record);
          break;
        case 'MODIFY':
          await modifyRecordHandler(record);
          break;
        case 'REMOVE':
          await removeRecordHandler(record);
          break;

        default:
          console.log(`Unexpect record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
