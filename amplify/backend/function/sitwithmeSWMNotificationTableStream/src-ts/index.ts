/* Amplify Params - DO NOT EDIT
	API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_PROFILECONVERSATIONTABLE_ARN
  API_SITWITHME_PROFILECONVERSATIONTABLE_NAME
  API_SITWITHME_PROFILEDEVICETOKENTABLE_ARN
  API_SITWITHME_PROFILEDEVICETOKENTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

// import { VenueLeaderboardService } from '@swm-core/services/venue-leaderboard.service';
import { Notification, NotificationKind } from '@swm-core/interfaces/notification.interface';
import { PushNotificationService } from '@swm-core/services/push-notification.service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const pushNotificationService = new PushNotificationService();

const insertRecordHandler = async (record: any) => {
  const notif: Notification = record.new;

  switch(notif.kind) {
    case NotificationKind.STAFF_SHIFT_ALARM_BEFORE_START: {
      await pushNotificationService.pushStaffShiftAlarmBeforeStart(notif);
      break;
    }

    case NotificationKind.PATRON_SHIFT_ALARM_BEFORE_START: {
      await pushNotificationService.pushPatronShiftAlarmBeforeStart(notif);
      break;
    }

    case NotificationKind.REQUEST_SITWITHME: {
      await pushNotificationService.pushRequestSWM(notif);
      break;
    }

    case NotificationKind.ACCEPT_REQUEST_SITWITHME: {
      await pushNotificationService.pushAcceptSWM(notif);
      break;
    }

    case NotificationKind.DIRECT_MESSAGE: {
      await pushNotificationService.pushDirectMessage(notif);
      break;
    }

    case NotificationKind.NO_SHIFTS_UPCOMING: {
      await pushNotificationService.pushNoShiftsUpcoming(notif);
      break;
    }

    case NotificationKind.BIRTHDAY: {
      await pushNotificationService.pushBirthday(notif);
      break;
    }

    default: {
      console.log(`WARNING: not support this type ${notif.kind}`);
      break;
    }
  }
};

const updateRecordHandler = async (record: any) => {
  const oldNotif: Notification = record.old;
  const newNotif: Notification = record.new;

  if (oldNotif.eventUpdatedAt !== newNotif.eventUpdatedAt) {
    if (newNotif.kind === NotificationKind.DIRECT_MESSAGE) {
      await pushNotificationService.pushDirectMessage(newNotif);
    }
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

  await Promise.all(records.map(async (record) => {
    try {
      switch (record.eventName) {
        case 'INSERT':
          await insertRecordHandler(record);
          break;
        case 'MODIFY':
          await updateRecordHandler(record);
          break;
        case 'REMOVE':
          break;

        default:
          console.log(`Unexpect record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      errors.push(e);
    }
  }));

  if (errors.length) {
    throw new Error(`Error: ${JSON.stringify(errors)}`);
  }
};
