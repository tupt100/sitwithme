import {ErrorCodeConst} from "@swm-core/constants/error-code.const";
import {Repeat, RepeatFrequency, WeekDay} from "@swm-core/interfaces/repeat.interface";
import {Shift} from "@swm-core/interfaces/shift.interface";
import {pipe} from "@swm-core/utils/fn.util";
import {DynamoDBService} from "./dynamodb.service";
import {ShiftAlarmService} from "./shift-alarm.service";
import {StepFunctionsService} from "./step-functions.service";

const shiftAlarmService = new ShiftAlarmService();

const stepFunctionsServiceMock = StepFunctionsService.prototype;
const dynamoDBServiceMock = DynamoDBService.prototype;


interface MockShiftInput {
  id: string;
  start: string;
  end: string;
  alert?: number;
}

const mockShift = (config: MockShiftInput): Shift => {
  return {
    id: config.id,
    start: config.start,
    end: config.end,
    '__typename': 'Shift',
    jobID: `m-job-${config.id}`,
    workplaceID: `m-workplace-${config.id}`,
    profileID: `m-profile-${config.id}`,
    alert: config.alert
  };
};

const withShiftRepeat = (repeat: Repeat) => (shift: Shift): Shift => ({ ...shift, repeat });
const mockRepeatDayShift = (every: number) => pipe(mockShift, withShiftRepeat({ frequency: RepeatFrequency.DAILY, every }));
const mockRepeatWeeklyShift = (every: number, weekDay: WeekDay) => pipe(mockShift, withShiftRepeat({ frequency: RepeatFrequency.WEEKLY, every, weekDay: [weekDay] }));
const mockRepeatMonthlyShift = (every: number, each: number[]) => pipe(mockShift, withShiftRepeat({ frequency: RepeatFrequency.MONTHLY, every, each }));
const mockStepFnArn = 'mockStepFnArn';

describe('ShiftAlarmService', () => {
  describe('execAlarmStepFunc', () => {
    let shift: Shift;

    beforeEach(() => {
      shift = mockRepeatDayShift(1)({
        id: '1',
        start: '2022-01-10T07:00:00.000Z',
        end: '2022-01-10T12:00:00.000Z'
      });
    });

    describe('success', () => {
      it('should not process if the alarm date is less than the anchor time', async () => {
        await shiftAlarmService.execAlarmStepFunc(
          shift,
          mockStepFnArn,
          new Date('2022-02-10T06:59:59.999Z'),
          {},
          new Date('2022-02-10T07:00:00.000Z'),
        );
      });

      it('should trigger step function and save the alarm to DB', async () => {
        const startExecutionFn = jest.spyOn(stepFunctionsServiceMock, 'startExecution').mockImplementation(async () => ({
          executionArn: 'mock',
          startDate: new Date()
        }));
        const putFn = jest.spyOn(dynamoDBServiceMock, 'put').mockImplementation(async () => undefined);

        await shiftAlarmService.execAlarmStepFunc(
          shift,
          mockStepFnArn,
          new Date('2022-02-10T09:00:00.000Z'),
          {},
          new Date('2022-02-10T07:00:00.000Z'),
        );

        expect(startExecutionFn).toBeCalled();
        expect(putFn).toBeCalled();
      });
    });
  });

  describe('execShiftAlertToStaff', () => {
    describe('success', () => {

      // it('should ');

    });

    describe('error', () => {
      let shift: Shift;

      it('should throw error if the shift does not have alert setting', async () => {
        shift = mockRepeatDayShift(1)({
          id: '1',
          start: '2022-01-10T07:00:00.000Z',
          end: '2022-01-10T12:00:00.000Z'
        });

        try {
          await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-10T07:00:00.000Z')
          );
        } catch (e) {
          expect(e.errCode).toEqual(ErrorCodeConst.BadRequest);
        }
      });
    });

    describe('daily', () => {
      describe('success', () => {
        let shift: Shift;

        beforeEach(() => {
          shift = mockRepeatDayShift(1)({
            id: '1',
            start: '2022-01-10T07:00:00.000Z',
            end: '2022-01-10T12:00:00.000Z',
            alert: 30
          });

          // mock
          jest.spyOn(stepFunctionsServiceMock, 'startExecution').mockImplementation(async () => ({
            executionArn: 'mock',
            startDate: new Date()
          }));
          jest.spyOn(dynamoDBServiceMock, 'put').mockImplementation(async () => undefined);
        });

        it('should set the shift alarm success in the same day', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-10T06:29:00.000Z')
          );

          expect(alarmDate).toEqual(new Date('2022-01-10T06:30:00.000Z'));
        });

        it('should set the shift alarm success before 1 day', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-09T06:29:00.000Z')
          );
          expect(alarmDate).toEqual(new Date('2022-01-10T06:30:00.000Z'));
        });

        it('should set the shift alarm success for next cycle', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-11T07:01:00.000Z')
          );
          expect(alarmDate).toEqual(new Date('2022-01-12T06:30:00.000Z'));
        });
      });
    });

    describe('weekly', () => {
      describe('success', () => {
        let shift: Shift;

        beforeEach(() => {
          shift = mockRepeatWeeklyShift(1, WeekDay.MONDAY)({
            id: '1',
            start: '2022-01-10T07:00:00.000Z',
            end: '2022-01-10T12:00:00.000Z',
            alert: 2880 // 2 days
          });

          // mock
          jest.spyOn(stepFunctionsServiceMock, 'startExecution').mockImplementation(async () => ({
            executionArn: 'mock',
            startDate: new Date()
          }));
          jest.spyOn(dynamoDBServiceMock, 'put').mockImplementation(async () => undefined);
        });

        it('should set the shift alarm success in the same day', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-10T06:29:00.000Z')
          );

          expect(alarmDate).toEqual(new Date('2022-01-15T07:00:00.000Z'));
        });

        it('should set the shift alarm success before 2 days', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-08T06:29:00.000Z')
          );
          expect(alarmDate).toEqual(new Date('2022-01-08T07:00:00.000Z'));
        });

        it('should set the shift alarm success for next cycle', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-11T07:01:00.000Z')
          );
          expect(alarmDate).toEqual(new Date('2022-01-15T07:00:00.000Z'));
        });

        it('should set the shift alarm success for next 2 cycles', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-15T07:01:00.000Z')
          );
          expect(alarmDate).toEqual(new Date('2022-01-22:07:00.000Z'));
        });
      });
    });

    describe('monthly', () => {
      describe('success', () => {
        let shift: Shift;

        beforeEach(() => {
          shift = mockRepeatMonthlyShift(1, [10])({
            id: '1',
            start: '2022-01-10T07:00:00.000Z',
            end: '2022-01-10T12:00:00.000Z',
            alert: 10080 // 7 days
          });

          // mock
          jest.spyOn(stepFunctionsServiceMock, 'startExecution').mockImplementation(async () => ({
            executionArn: 'mock',
            startDate: new Date()
          }));
          jest.spyOn(dynamoDBServiceMock, 'put').mockImplementation(async () => undefined);
        });

        it('should set the shift alarm success in the same day', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-10T06:29:00.000Z')
          );

          expect(alarmDate).toEqual(new Date('2022-02-03T07:00:00.000Z'));
        });

        it('should set the shift alarm success before 7 days', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-01-01T06:29:00.000Z')
          );
          expect(alarmDate).toEqual(new Date('2022-01-03T07:00:00.000Z'));
        });

        it('should set the shift alarm success for next cycle', async () => {
          const alarmDate = await shiftAlarmService.execShiftAlertToStaff(
            shift,
            mockStepFnArn,
            new Date('2022-02-05T07:01:00.000Z')
          );
          expect(alarmDate).toEqual(new Date('2022-03-03T07:00:00.000Z'));
        });
      });
    });
  });
});
