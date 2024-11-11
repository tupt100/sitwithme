/* Amplify Params - DO NOT EDIT
	ENV
	REGION
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

import { ShiftAlarmType } from "@swm-core/interfaces/shift-alarm.interface";
import { NotificationService } from "@swm-core/services/notification.service";
import { ProfileService } from "@swm-core/services/profile.service";
import { ShiftAlarmService } from "@swm-core/services/shift-alarm.service";
import { ShiftService } from "@swm-core/services/shift.service";
import { SQSService } from "@swm-core/services/sqs-service";
import { UserService } from "@swm-core/services/user.service";
import { WorkplaceService } from "@swm-core/services/workplace.service";

const {
  ALARM_STAFF_QUEUE_URL,
  ALARM_STATEMACHINE_ARN
} = process.env;

const sqsService = new SQSService();
const shiftAlarmService = new ShiftAlarmService();
const notificationService = new NotificationService();
const shiftService = new ShiftService();
const workplaceService = new WorkplaceService();
const profileService = new ProfileService();
const userService = new UserService();

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

  // verify shift alarm is valid or not first
  const shiftAlarm = await shiftAlarmService.get(data.shiftAlarmID);
  if (shiftAlarm) {
    const profile = await profileService.get(shiftAlarm.recipientProfileID);
    if (profile) {
      const user = await userService.get(profile.userID);
      // Ensure user not deleted
      if (user && !user.deleted) {

        switch (data.type) {
          case ShiftAlarmType.STAFF_SHIFT_ALERT: {
            const shift = await shiftService.get(shiftAlarm.shiftID);
            if (shift) {
              console.log("save notification STAFF_SHIFT_ALERT");
              const workplace = await workplaceService.get(shift.workplaceID);
              await notificationService.createStaffShiftAlarmBeforeStart({
                recipientProfileID: data.recipientProfileID,
                shiftID: shiftAlarm.shiftID,
                shiftAlert: shift?.alert,
                shiftWorkplaceName: workplace?.name
              });

              // If this shift is repeat-shift, then calculate alarm for next cycle
              if (shift.repeat) {
                if (typeof shift?.alert !== 'undefined' && shift?.alert !== null) {
                  // if the shift alarm is before the shift start, then we need to setup alarm for next event in the next 2 cycles.
                  const cycleStep = shift.alert === 0 ? 1 : 2;
                  console.log("SQSAlarmStaff: calculate next alarm");
                  const anchorTime = new Date(data.alarmDate);
                  anchorTime.setSeconds(anchorTime.getSeconds() + 1); // to skip event that match now
                  await shiftAlarmService.execShiftAlertToStaff(shift, ALARM_STATEMACHINE_ARN, anchorTime, cycleStep);
                }
              }
            }

            // Ack ShiftAlarm record
            await shiftAlarmService.delete(shiftAlarm.id);
            console.log("success");
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
    QueueUrl: ALARM_STAFF_QUEUE_URL,
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
