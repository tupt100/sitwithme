/**
 *
 * Lambda for handling Shift table dynamodb stream.
 *
 * When Shift create/update/delete:
 *  1. Sync data with explore profile table to support ES
 *  2. Handle Alert for this Shift, include:
 *    - Notify to Staff when Shift Alert setting is on time.
 *    - Notify to Patron when Shift is on 30 min before start, start time, and end time.
 *
 */

/* Amplify Params - DO NOT EDIT
  API_SITWITHME_EXPLOREPROFILETABLE_ARN
  API_SITWITHME_EXPLOREPROFILETABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_JOBTABLE_ARN
  API_SITWITHME_JOBTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SHIFTALARMTABLE_ARN
  API_SITWITHME_SHIFTALARMTABLE_NAME
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  API_SITWITHME_STAFFLEADERBOARDTABLE_ARN
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { ShiftAlarmType } from '@swm-core/interfaces/shift-alarm.interface';
import { Shift } from '@swm-core/interfaces/shift.interface';
import { ExploreProfileService } from '@swm-core/services/explore-profile.service';
import { ShiftAlarmService } from '@swm-core/services/shift-alarm.service';
import { changed, isArrayChanged } from '@swm-core/utils/comparison.util';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const {
  ALARM_STATEMACHINE_ARN,
} = process.env;

const exploreProfileService = new ExploreProfileService();
const shiftAlarmService = new ShiftAlarmService();

/**
 * Notify to Staff with Shift Alert setting
 * Notify to Patron before 30 mins
 * @param shift
 */
const setupShiftAlertAlarm = async (shift: Shift, date: Date = new Date()) => {
  try {
    // 2.1 Notify to Staff with Shift Alert setting
    console.log("[Alarm] setup");
    if (typeof shift.alert !== 'undefined' && shift.alert !== null) {
      await shiftAlarmService.execShiftAlertToStaff(shift, ALARM_STATEMACHINE_ARN, date, 1);
    }
    // 2.2 Notify to Patron before 30 mins
    await shiftAlarmService.execShiftAlertToPatron(shift, ALARM_STATEMACHINE_ARN, date, 1);
  } catch (e) {
    // silent error, no need to throw error
    console.log("[Alarm] ERROR when insert new Shift: ", e);
  }
};

/**
 * Handle Alert for ON duty
 * Notify to Patron know Shift start
 * @param shift
 * @param date
 */
const setupShiftStartAlarm = async (shift: Shift, date: Date = new Date()) => {
  try {
    await shiftAlarmService.execShiftStartToPatron(shift, ALARM_STATEMACHINE_ARN, date, 1);
  } catch (e) {
    // silent error, no need to throw error
    console.log("[ShiftStart] ERROR when init shift start alarm");
  }
};

/**
 * Handle Alert for OFF duty
 * Notify to Patron know Shift end
 * @param shift
 * @param date
 */
const setupShiftEndAlarm = async (shift: Shift, date: Date = new Date()) => {
  try {
    await shiftAlarmService.execShiftEndToPatron(shift, ALARM_STATEMACHINE_ARN, date, 0);
  } catch (e) {
    // silent error, no need to throw error
    console.log("[ShiftEnd] ERROR when init shift start alarm");
  }
};

/**
 * Stop old Shift alert alarm and re-create new alert alarm
 * @param oldShift
 * @param newShift
 */
const updateShiftAlertAlarm = async (oldShift: Shift, newShift: Shift, date: Date = new Date()) => {
  try {
    if (oldShift.start !== newShift.start || oldShift.alert !== newShift.alert || oldShift.endRepeat !== newShift.endRepeat || isArrayChanged(oldShift.excepts?.values, newShift.excepts?.values)) {
      // 2.1 Stop old Shift alarm
      await shiftAlarmService.deleteShiftAlertAlarms(oldShift.id);

      // 2.2 Notify to Staff with Shift Alert setting
      await setupShiftAlertAlarm(newShift, date);
    }
  } catch (e) {
    // silent error, no need to throw error
    console.log("[Alarm] ERROR when update Shift: ", e);
  }
};

const updateShiftStartAlarm = async (oldShift: Shift, newShift: Shift, date: Date = new Date()) => {
  try {
    if (oldShift.start !== newShift.start || oldShift.endRepeat !== newShift.endRepeat || isArrayChanged(oldShift.excepts?.values, newShift.excepts?.values)) {
      // 2.1 Stop old Shift alarm
      await shiftAlarmService.deleteShiftStartAlarms(oldShift.id);

      // 2.2 Notify to Staff with Shift Alert setting
      await setupShiftStartAlarm(newShift, date);
    }
  } catch (e) {
    // silent error, no need to throw error
    console.log("[updateShiftStartAlarm] ERROR when update Shift: ", e);
  }
};

const updateShiftEndAlarm = async (oldShift: Shift, newShift: Shift, date: Date = new Date()) => {
  try {
    if (oldShift.end !== newShift.end || oldShift.endRepeat !== newShift.endRepeat || isArrayChanged(oldShift.excepts?.values, newShift.excepts?.values)) {
      // 2.1 Stop old Shift alarm
      await shiftAlarmService.deleteShiftEndAlarms(oldShift.id);

      // 2.2 Notify to Staff with Shift Alert setting
      await setupShiftEndAlarm(newShift, date);
    }
  } catch (e) {
    // silent error, no need to throw error
    console.log("[updateShiftStartAlarm] ERROR when update Shift: ", e);
  }
};

const insertRecordHandler = async (record: any) => {
  console.log('Start shift insertRecordHandler', record);
  // 1. Sync data with explore profile table to support ES
  const { profileID, workplaceID, jobID, alert } = record.new;
  const existedExploreProfile = await exploreProfileService.getExistedExploreProfile(profileID, workplaceID, jobID);

  if (!existedExploreProfile) {
    await exploreProfileService.create(record.new);
  } else {
    console.log('Insert new shift but has existed profile', existedExploreProfile);
    // Update ExploreProfile if existed (When create new shift in same workplace and job)
    await exploreProfileService.update(record.new);
  }

  // 2. Setup alarm for this Shift
  const now = new Date();
  await Promise.all([
    setupShiftAlertAlarm(record.new, now),
    setupShiftStartAlarm(record.new, now),
    setupShiftEndAlarm(record.new, now)
  ]);
};

const updateRecordHandler = async (record: any) => {
  console.log('Start shift updateRecordHandler', record);
  // 1. Sync data with explore profile table to support ES
  const oldShift = record.old;
  const newShift = record.new;
  const existedExploreProfile = await exploreProfileService.getExistedExploreProfile(newShift.profileID, newShift.workplaceID, newShift.jobID);
  console.log('Update existedExploreProfile: ', existedExploreProfile);

  try {
    if (existedExploreProfile) {
      await exploreProfileService.update(newShift);
    } else {
      // Create new explore profile if not existed (when change workplace, job);
      await exploreProfileService.create(newShift);
    }

    // Remove out date record
    if (
      oldShift.profileID !== newShift.profileID ||
      oldShift.workplaceID !== newShift.workplaceID ||
      oldShift.jobID !== newShift.jobID
    ) {
      await exploreProfileService.delete({
        profileID: oldShift.profileID,
        workplaceID: oldShift.workplaceID,
        jobID: oldShift.jobID,
      });
    }
  } catch (e) {
    console.log('[Update Explore Profile Error]: ', JSON.stringify(e, null, 2));
    throw new Error(e);
  }

  // 2. Handle Alert for this Shift.
  const now = new Date();
  await Promise.all([
    updateShiftAlertAlarm(oldShift, newShift, now),
    updateShiftStartAlarm(oldShift, newShift, now),
    updateShiftEndAlarm(oldShift, newShift, now)
  ]);
};

const removeRecordHandler = async (record: any) => {
  console.log('Start shift removeRecordHandler', record);

  // 1. Sync data with explore profile table to support ES
  const oldShift = record.old;
  const existedExploreProfile = await exploreProfileService.getExistedExploreProfile(oldShift.profileID, oldShift.workplaceID, oldShift.jobID);
  console.log('Remove existedExploreProfile: ', existedExploreProfile);

  try {
    if (existedExploreProfile) {
      await exploreProfileService.delete({
        profileID: existedExploreProfile.profileID,
        workplaceID: existedExploreProfile.workplaceID,
        jobID: existedExploreProfile.jobID,
      });
    }
  } catch (e) {
    console.log('Remove Explore Profile Error: ', JSON.stringify(e, null, 2));
    throw new Error(e);
  }

  // 2. Handle Alert for this Shift. When Shift deleted, stop Shift alarm
  try {
    await Promise.all([
      shiftAlarmService.deleteShiftAlertAlarms(oldShift.id),
      shiftAlarmService.deleteShiftStartAlarms(oldShift.id),
      shiftAlarmService.deleteShiftEndAlarms(oldShift.id)
    ]);
  } catch (e) {
    // silent error, no need to throw error
    console.log("[Alarm] ERROR when delete Shift: ", e);
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
          await updateRecordHandler(record);
          break;
        case 'REMOVE':
          await removeRecordHandler(record);
          break;

        default:
          console.log(`Unexpect record: ${JSON.stringify(record, null, 2)}`);
      }
    } catch (e) {
      console.log("ERROR: ", JSON.stringify(record, null, 2));
      errors.push(e);
    }
  }

  if (errors.length) {
    console.log('[Shift Table Stream] Error: ', errors);
    throw new Error(`[Shift Table Stream] Error: ${JSON.stringify(errors)}`);
  }
};
