/* Amplify Params - DO NOT EDIT
	ENV
	REGION
  API_SITWITHME_FOLLOWINGTABLE_ARN
  API_SITWITHME_FOLLOWINGTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SHIFTALARMTABLE_ARN
  API_SITWITHME_SHIFTALARMTABLE_NAME
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
Amplify Params - DO NOT EDIT */

import { AlarmConst } from "@swm-core/constants/alarm.const";
import { NotificationSNSMessage, NotificationType } from "@swm-core/interfaces/push-notification.interface";
import { ShiftAlarm, ShiftAlarmType } from "@swm-core/interfaces/shift-alarm.interface";
import { Shift } from "@swm-core/interfaces/shift.interface";
import { FollowingService } from "@swm-core/services/following.service";
import { NotificationService } from "@swm-core/services/notification.service";
import { ProfileService } from "@swm-core/services/profile.service";
import { ShiftAlarmService } from "@swm-core/services/shift-alarm.service";
import { ShiftService } from "@swm-core/services/shift.service";
import { SNSService } from "@swm-core/services/sns-service";
import { SQSService } from "@swm-core/services/sqs-service";
import { UserService } from "@swm-core/services/user.service";
import { WorkplaceService } from "@swm-core/services/workplace.service";
import { addMinutes } from "@swm-core/utils/date.util";

const {
  ALARM_PATRON_QUEUE_URL,
  ALARM_STATEMACHINE_ARN,
  PUSH_NOTIFICATION_TOPIC_ARN
} = process.env;

const sqsService = new SQSService();
const shiftAlarmService = new ShiftAlarmService();
const notificationService = new NotificationService();
const followingService = new FollowingService();
const shiftService = new ShiftService();
const workplaceService = new WorkplaceService();
const snsService = new SNSService();
const profileService = new ProfileService();
const userService = new UserService();

/**
 * 1. Send notification to Patron
 * 2. Setup new alert
 */
const handleShiftAlertToPatron = async (shiftAlarm: ShiftAlarm, senderProfileID: string, date = new Date(), step: number = 2) => {
  const shift = await shiftService.get(shiftAlarm.shiftID);
  if (shift) {
    // 1. Send notification to Patron
    console.log("save notification PATRON_SHIFT_ALERT");
    const followings = await followingService.listFollowingConfirmedByStaffID(senderProfileID);
    const workplace = await workplaceService.get(shift.workplaceID);

    await Promise.all(followings.map(async (f) => {
      return await notificationService.createPatronShiftAlarmBeforeStart({
        recipientProfileID: f.patronID,
        shiftID: shiftAlarm.shiftID,
        senderProfileID,
        shiftAlert: AlarmConst.PATRON_SHIFT_ALARM_BEFORE_START,
        shiftWorkplaceName: workplace?.name
      });
    }));

    // 2. If this shift is repeat-shift, then calculate alarm for next cycle
    if (shift.repeat) {
      console.log("SQSAlarmPatron: calculate next alarm");
      await shiftAlarmService.execShiftAlertToPatron(shift, ALARM_STATEMACHINE_ARN, date, step);
    }
  }

  // Ack ShiftAlarm record
  await shiftAlarmService.delete(shiftAlarm.id);
  console.log("success");
};

/**
 * 1. Send subscription notify to patrons
 * 2. Setup next shift start alarm
 */
const handleShiftStartToPatron = async (shiftAlarm: ShiftAlarm, date = new Date(), step = 1) => {
  const shift = await shiftService.get(shiftAlarm.shiftID);
  if (shift) {
    // 1. notify to patrons via subscription
    try {
      const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.SHIFT_START, body: shift };
      await snsService.publish({
        Message: JSON.stringify(notificationSNSMessage),
        TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
      });
    } catch (e) {
      console.log('[handleShiftStartToPatron] ERROR: ', e);
    }

    // 2. setup next shift start alarm
    if (shift.repeat) {
      console.log("[handleShiftStartToPatron]: calculate next alarm");
      await shiftAlarmService.execShiftStartToPatron(shift, ALARM_STATEMACHINE_ARN, date, step);
    }
  }

  // Ack ShiftAlarm record
  await shiftAlarmService.delete(shiftAlarm.id);
};

/**
 * 1. Send subscription notify to patrons
 * 2. Notify to staff if there is no shifts upcoming
 * 3. Setup next shift end alarm
 */
const handleShiftEndToPatron = async (shiftAlarm: ShiftAlarm, date = new Date(), step = 1) => {
  const shift = await shiftService.get(shiftAlarm.shiftID);
  if (shift) {
    // 1. notify to patrons via subscription
    const shiftEvent: Shift = await shiftService.getStaffShiftEventAtDay(shift.profileID, date);
    const duty = shiftService.checkDuty(shiftEvent, date); // for ensure staff didn't duty because switch OFF manually
    if (duty) { // if duty is true, means now is the time at the end of shift event
      try {
        console.log('[handleShiftEndToPatron] notifying...');
        const notificationSNSMessage: NotificationSNSMessage = { notificationType: NotificationType.SHIFT_END, body: shift };
        await snsService.publish({
          Message: JSON.stringify(notificationSNSMessage),
          TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
        });
      } catch (e) {
        console.log('[handleShiftEndToPatron] ERROR: ', e);
      }
    }

    // 2. Notify to staff if there is no shifts upcoming
    try {
      const nextMin = addMinutes(date, 1); // for sure it's not overlap with old shifts range time
      const hasShifts = await shiftService.hasShiftsUpcoming(shiftAlarm.recipientProfileID, nextMin);
      console.log('[handleShiftEndToPatron] begine notify to staff: ', hasShifts);
      if (!hasShifts) {
        await notificationService.createNoShiftsUpcomingNotif({
          recipientProfileID: shiftAlarm.recipientProfileID
        });
      }
    } catch (e) {
      console.log('[handleShiftEndToPatron] notify to staff: ', e);
    }

    // 3. setup next shift end alarm
    if (shift.repeat) {
      console.log("[handleShiftEndToPatron]: calculate next alarm");
      await shiftAlarmService.execShiftEndToPatron(shift, ALARM_STATEMACHINE_ARN, date, step);
    }
  }

  // Ack ShiftAlarm record
  await shiftAlarmService.delete(shiftAlarm.id);
};

const recordHandler = async (record) => {
  console.log("Record: ", JSON.stringify(record, null, 2));
  const body = JSON.parse(record.body);

  /**
   * data format:
   * {
   *   "alarmDate": "2021-08-11T11:00:00.000Z",
   *   "shiftAlarmID": "xxx",
   *   "type": "alert_type",
   *   "recipientProfileID": "yy"
   * }
   */
  const data = JSON.parse(body.Message);
  const alarmDate = new Date(data.alarmDate);

  // verify shift alarm is valid or not first
  const shiftAlarm = await shiftAlarmService.get(data.shiftAlarmID);
  if (shiftAlarm) {
    const profile = await profileService.get(shiftAlarm.recipientProfileID);
    if (profile) {
      const user = await userService.get(profile.userID);
      // Ensure user not deleted
      if (user && !user.deleted) {

        switch (data.type) {
          case ShiftAlarmType.PATRON_SHIFT_ALERT: {
            await handleShiftAlertToPatron(shiftAlarm, data.recipientProfileID, alarmDate, 2);
            break;
          }

          case ShiftAlarmType.PATRON_SHIFT_START: {
            await handleShiftStartToPatron(shiftAlarm, alarmDate, 1);
            break;
          }

          case ShiftAlarmType.PATRON_SHIFT_END: {
            await handleShiftEndToPatron(shiftAlarm, alarmDate, 1);
            break;
          }

          default:
            throw new Error(`Not support this event type ${data.type}`);
        }

      }
    }

  }

  // ack sqs message
  await sqsService.deleteMessage({
    QueueUrl: ALARM_PATRON_QUEUE_URL,
    ReceiptHandle: record.receiptHandle
  });
};

export const handler = async (event) => {
  console.log("event: ", JSON.stringify(event, null, 2));
  let errorMsg;

  for (const record of event.Records) {
    try {
      await recordHandler(record);
    } catch (e) {
      console.log("ERROR: ", e);
      errorMsg = e.errorMsg || "Unknown Error";
    }
  }

  if (errorMsg) {
    throw new Error(errorMsg);
  }
};
