/* Amplify Params - DO NOT EDIT
	ENV
	REGION
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_ARN
  API_SITWITHME_PROFILESUBSCRIPTIONTABLE_NAME
Amplify Params - DO NOT EDIT */

import { ProfileSubscription, ProfileSubscriptionAlarmType, ProfileSubscriptionStatus } from '@swm-core/interfaces/profile-subscription.interface';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { ProfileSubscriptionService } from '@swm-core/services/profile-subscription.service';
import { SNSService } from '@swm-core/services/sns-service';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const {
  ALARM_STATEMACHINE_ARN,
  PUSH_NOTIFICATION_TOPIC_ARN
} = process.env;

const profileSubscriptionService = new ProfileSubscriptionService();
const snsService = new SNSService();

const setupAlarm = async (profileSubscription: ProfileSubscription, date: Date) => {
  if (profileSubscription.expiredAt && new Date(profileSubscription.expiredAt).getTime() > date.getTime()) {
    await profileSubscriptionService.execAlarmStepFunc(profileSubscription, ALARM_STATEMACHINE_ARN, new Date(profileSubscription.expiredAt), { type: ProfileSubscriptionAlarmType.IAP_EXPIRED }, new Date());
  } else {
    console.log('[ProfileSubscriptionStream] Unexpected Error', profileSubscription);
  }
};

// notify realtime via subscription
const notifyProfileMemberShipUpdated = async (profileSubscription: ProfileSubscription) => {
  try {
    const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.IAP_UPDATED, body: profileSubscription };
    await snsService.publish({
      Message: JSON.stringify(notificationSNSMessage),
      TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
    });
  } catch (e) {
    // silent error
    console.log('[notifyProfileMemberShipUpdated] ERROR push notification: ', e);
  }
};

const insertRecordHandler = async (record: any) => {
  const profileSubscription: ProfileSubscription = record.new;
  const now = new Date();

  if (profileSubscription.status === ProfileSubscriptionStatus.ACTIVATED) {
    await setupAlarm(profileSubscription, now);

    // notify realtime via subscription
    await notifyProfileMemberShipUpdated(profileSubscription);
  }
};

const removeRecordHandler = async (record: any) => {
  const profileSubscription: ProfileSubscription = record.old;
  if (profileSubscription.status === ProfileSubscriptionStatus.ACTIVATED) {
    // invalidate old step func
    if (profileSubscription.stepFuncExecArn) {
      try {
        await profileSubscriptionService.stopAlarm(profileSubscription);
      } catch (e) {
        // silent error, does not need to throw
        console.log('[removeRecordHandler] Stop Alarm error', e);
      }
    }
  }
};

const modifyRecordHandler = async (record: any) => {
  const oldProfileSubscription: ProfileSubscription = record.old;
  const newProfileSubscription: ProfileSubscription = record.new;

  // if have change status or expired At, then invalidate old step function and exec a new one
  if (oldProfileSubscription.status !== newProfileSubscription.status ||
    new Date(oldProfileSubscription.expiredAt || null).getTime() !== new Date(newProfileSubscription.expiredAt || null).getTime()) {

    if (newProfileSubscription.status === ProfileSubscriptionStatus.ACTIVATED) {
      // invalidate old step func
      if (newProfileSubscription.stepFuncExecArn) {
        try {
          await profileSubscriptionService.stopAlarm(newProfileSubscription);
        } catch (e) {
          // silent error, does not need to throw
          console.log('[modifyRecordHandler] Stop Alarm error', e);
        }
      }

      // setup a new one
      await setupAlarm(newProfileSubscription, new Date());
    }

    // notify realtime via subscription
    await notifyProfileMemberShipUpdated(newProfileSubscription);
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
