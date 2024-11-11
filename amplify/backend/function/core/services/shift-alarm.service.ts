import { v4 as uuidv4 } from 'uuid';
import { CreateShiftAlarmInput, ShiftAlarm, ShiftAlarmType } from "@swm-core/interfaces/shift-alarm.interface";
import { Shift } from "@swm-core/interfaces/shift.interface";
import { DynamoDBService } from './dynamodb.service';
import { StepFunctionsService } from './step-functions.service';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { ShiftRepeatService } from './shift-repeat.service';
import { AlarmConst } from '@swm-core/constants/alarm.const';

const dynamoDBService = new DynamoDBService();
const stepFunctionsService = new StepFunctionsService();
const shiftRepeatService = new ShiftRepeatService();

const {
  API_SITWITHME_SHIFTALARMTABLE_NAME,
} = process.env;

export class ShiftAlarmService {

  async create(input: CreateShiftAlarmInput): Promise<ShiftAlarm> {
    console.log("[Alarm] params", JSON.stringify(input, null, 2));
    const now = new Date().toISOString();
    const shiftAlarm: ShiftAlarm = {
      ...input,
      id: input.id || uuidv4(),
      __typename: 'ShiftAlarm',
      createdAt: now
    };

    await dynamoDBService.put({
      TableName: API_SITWITHME_SHIFTALARMTABLE_NAME,
      Item: shiftAlarm
    });

    return shiftAlarm;
  }

  async listShiftAlarmsByShiftID(shiftID: string): Promise<ShiftAlarm[]> {
    const params = {
      TableName: API_SITWITHME_SHIFTALARMTABLE_NAME,
      IndexName: 'byShiftID',
      KeyConditionExpression: '#shiftID = :shiftID',
      ExpressionAttributeNames: {
        '#shiftID': 'shiftID',
      },
      ExpressionAttributeValues: {
        ':shiftID': shiftID,
      }
    };

    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as ShiftAlarm[];
    }
    return [];
  }

  /**
   * Trigger Alarm Step function and save it to ShiftAlarm table
   *
   * @param shift
   * @param stateMachineArn
   * @param alarmDate
   * @param data
   * @param date
   */
  async execAlarmStepFunc(shift: Shift, stepFuncArn: string, alarmDate: Date, data: any = {}, date: Date = new Date()) {
    // ignore alarm if passing time
    if (alarmDate.getTime() < date.getTime()) {
      return;
    }

    console.log("[Alarm] execAlarmStepFunc");

    const shiftAlarmID = uuidv4();
    const execution = await stepFunctionsService.startExecution({
      stateMachineArn: stepFuncArn,
      name: uuidv4(),
      input: JSON.stringify({
        alarmDate: alarmDate.toISOString(),
        shiftAlarmID,
        type: data.type,
        recipientProfileID: shift.profileID
      })
    });
    console.log("[Alarm] alarmDate", alarmDate.toISOString());
    console.log("[Alarm] execution", JSON.stringify(execution, null, 2));
    console.log("[Alarm] shift:", JSON.stringify(shift, null, 2));

    await this.create({
      id: shiftAlarmID,
      shiftID: shift.id,
      type: data.type,
      recipientProfileID: shift.profileID,
      stepFuncExecArn: execution.executionArn,
      stepFuncExecStartDate: execution.startDate.toISOString()
    });
  }

  async execShiftAlertToPatron(shift: Shift, stepFuncArn: string, date: Date = new Date(), step: number = 1) {
    console.log("[Alarm] execShiftAlertToPatron");
    const beforeTimeInMins = AlarmConst.PATRON_SHIFT_ALARM_BEFORE_START;

    let stepTried = step;
    const maxStepTried = stepTried + 1; // retry 2 times is enough because the next Shift will start in the next day at least

    do {
      const _step = stepTried;
      stepTried++;

      const endRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
      const event = shiftRepeatService.getNextEvent(shift.repeat, new Date(shift.start), new Date(shift.end), new Date(date), endRepeat, _step, shift.excepts?.values?.map(e => new Date(e)));
      console.log("[Alarm] event", JSON.stringify(event, null, 2));

      if (event) {
        const alarmDate = new Date(event.start);
        alarmDate.setMinutes(alarmDate.getMinutes() - beforeTimeInMins);

        // retry to looking for next event has valid alarm date
        if (alarmDate.getTime() < date.getTime()) {
          continue;
        }
        await this.execAlarmStepFunc(shift, stepFuncArn, alarmDate, { type: ShiftAlarmType.PATRON_SHIFT_ALERT }, date);
        break;
      }

      // if there is no next event, it means the shift has finished, no need to alarm
      break;

    } while (stepTried <= maxStepTried);
  }

  /**
   * Trigger Shift Alert
   *
   * 1. Execute Step function Alarm
   * 2. Save the Alarm to ShiftAlarm, then Step function Alarm can verify later before
   *   pushing notification
   *
   * @param shift
   */
  async execShiftAlertToStaff(shift: Shift, stepFuncArn: string, date: Date = new Date(), step: number = 1): Promise<Date> {
    if (typeof shift.alert === 'undefined' || shift.alert === null) {
      throw new BadRequestException("This shift doesn't have alert setting");
    }
    console.log("[Alarm] execShiftAlertToStaff");
    let stepTried = step;
    const maxStepTried = stepTried + 10; // The max alert now is one week before, so we try 10 times is fine

    do {
      const _step = stepTried;
      stepTried++;

      const endRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
      const event = shiftRepeatService.getNextEvent(shift.repeat, new Date(shift.start), new Date(shift.end), new Date(date), endRepeat, _step, shift.excepts?.values?.map(e => new Date(e)));
      console.log("[Alarm] event", JSON.stringify(event, null, 2));

      if (event) {
        const alarmDate = new Date(event.start);
        alarmDate.setMinutes(alarmDate.getMinutes() - shift.alert);

        // retry to looking for next event has valid alarm date
        if (alarmDate.getTime() < date.getTime()) {
          continue;
        }
        await this.execAlarmStepFunc(shift, stepFuncArn, alarmDate, { type: ShiftAlarmType.STAFF_SHIFT_ALERT }, date);
        return alarmDate;
      }

      // if there is no next event, it means the shift has finished, no need to alarm
      break;

    } while (stepTried <= maxStepTried);
  }

  /**
   * Trigger Shift Start Alarm
   *
   * 1. Execute Step function Alarm
   * 2. Save the Alarm to ShiftAlarm, then Step function Alarm can verify later before
   *   pushing notification
   *
   * @param shift
   */
  async execShiftStartToPatron(shift: Shift, stepFuncArn: string, date: Date = new Date(), step: number = 1) {
    const event = shiftRepeatService.getNextEvent(shift.repeat, new Date(shift.start), new Date(shift.end), new Date(date), new Date(shift.endRepeat), step, shift.excepts?.values?.map(e => new Date(e)));
    console.log("[execShiftStartToPatron] event", JSON.stringify(event, null, 2));

    if (event) {
      await this.execAlarmStepFunc(shift, stepFuncArn, new Date(event.start), { type: ShiftAlarmType.PATRON_SHIFT_START }, date);
    }
  }

  /**
   * Trigger Shift End Alarm
   *
   * 1. Execute Step function Alarm
   * 2. Save the Alarm to ShiftAlarm, then Step function Alarm can verify later before
   *   pushing notification
   *
   * @param shift
   */
   async execShiftEndToPatron(shift: Shift, stepFuncArn: string, date: Date = new Date(), step: number = 0) {
    let stepTried = step;
    const maxStepTried = stepTried + 1; // retry 2 times is enough because the next Shift will start in the next day at least

    do {
      const _step = stepTried;
      stepTried++;

      const endRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
      const event = shiftRepeatService.getNextEvent(shift.repeat, new Date(shift.start), new Date(shift.end), new Date(date), endRepeat, _step, shift.excepts?.values?.map(e => new Date(e)));
      console.log("[execShiftEndToPatron] event", JSON.stringify(event, null, 2));

      if (event) {
        const alarmDate = new Date(event.end);

        // retry to looking for next event has valid alarm date
        if (alarmDate.getTime() < date.getTime()) {
          continue;
        }
        await this.execAlarmStepFunc(shift, stepFuncArn, new Date(event.end), { type: ShiftAlarmType.PATRON_SHIFT_END }, date);
        break;
      }

      // if there is no next event, it means the shift has finished, no need to alarm
      break;

    } while (stepTried <= maxStepTried);
  }

  async delete(id: string) {
    await dynamoDBService.delete({
      TableName: API_SITWITHME_SHIFTALARMTABLE_NAME,
      Key: { id }
    });
  }

  async get(id: string): Promise<ShiftAlarm> {
    return <ShiftAlarm>(await dynamoDBService.get({
      TableName: process.env.API_SITWITHME_SHIFTALARMTABLE_NAME,
      Key: { id },
    })).Item;
  }

  async stopShiftAlarms(shiftID: string, types: ShiftAlarmType[] = []) {
    let shiftAlarms = await this.listShiftAlarmsByShiftID(shiftID);
    shiftAlarms = shiftAlarms.filter((alarm) => types.includes(alarm.type));

    if (shiftAlarms.length) {
      await dynamoDBService.batchDelete(API_SITWITHME_SHIFTALARMTABLE_NAME, shiftAlarms.map(alarm => ({ id: alarm.id })));
      try {
        const stopStepFuncTasks = shiftAlarms.map((alarm) => {
          return stepFunctionsService.stopExecution({ executionArn: alarm.stepFuncExecArn });
        });
        await Promise.all(stopStepFuncTasks);
      } catch (e) {
        // silent error. The step function still run but can't push notification
        // because we checked it in Alarm state.
        console.log("ERROR: ", e);
      }
    }
  }

  async deleteShiftAlertAlarms(shiftID: string) {
    return this.stopShiftAlarms(shiftID, [ShiftAlarmType.STAFF_SHIFT_ALERT, ShiftAlarmType.PATRON_SHIFT_ALERT]);
  }

  async deleteShiftStartAlarms(shiftID: string) {
    return this.stopShiftAlarms(shiftID, [ShiftAlarmType.PATRON_SHIFT_START]);
  }

  async deleteShiftEndAlarms(shiftID: string) {
    return this.stopShiftAlarms(shiftID, [ShiftAlarmType.PATRON_SHIFT_END]);
  }
}
