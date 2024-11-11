import { ErrorCodeConst } from "@swm-core/constants/error-code.const";
import { Job } from "@swm-core/interfaces/job.interface";
import { Repeat, RepeatFrequency, WeekDay } from "@swm-core/interfaces/repeat.interface";
import { SavingTime, Shift, ShiftEventDetail, ShiftInput } from "@swm-core/interfaces/shift.interface";
import { Workplace } from "@swm-core/interfaces/workplace.interface";
import { pipe } from "@swm-core/utils/fn.util";
import { DynamoDBService } from "./dynamodb.service";
import { JobService } from "./job.service";
import { ShiftService } from "./shift.service";
import { WorkplaceService } from "./workplace.service";

const shiftService = new ShiftService();

const jobServiceMock = JobService.prototype;
const shiftServiceMock = ShiftService.prototype;
const workplaceServiceMock = WorkplaceService.prototype;
const dynamoDBServiceMock = DynamoDBService.prototype;

interface MockShiftInput {
  id: string;
  start: string;
  end: string;
  ianaTz?: string;
  savingTime?: SavingTime;
}
const mockTz = 'America/Indiana/Indianapolis';
const makeShiftInput = (start: string, end: string, jobID: string, workplaceID: string, profileID: string): ShiftInput => ({ start, end, jobID, workplaceID, profileID });

const mockJob = (id: string): Job => ({ id, name: `m-name-${id}` });
const mockWorkplace = (id: string): Workplace => {
  return {
    id,
    name: `m-name-${id}`,
    yelpBusinessID: `m-yelpBusinessID-${id}`,
    '__typename': 'Workplace',
    location: { latitude: 0, longitude: 0 },
    fullAddress: `m-addr-${id}`,
    profileID: `m-profile-${id}`
  };
};
const mockShift = (config: MockShiftInput): Shift => {
  return { id: config.id, start: config.start, end: config.end, '__typename': 'Shift', jobID: `m-job-${config.id}`, workplaceID: `m-workplace-${config.id}`, profileID: `m-profile-${config.id}`, ianaTz: config.ianaTz, savingTime: config.savingTime };
};

const withShiftExcepts = (values: string[]) => (shift: Shift) => ({ ...shift, excepts: { values } });
const withShiftRepeat = (repeat: Repeat) => (shift: Shift): Shift => ({ ...shift, repeat });
const mockRepeatDayShift = (every: number) => pipe(mockShift, withShiftRepeat({ frequency: RepeatFrequency.DAILY, every }));
const mockRepeatWeeklyShift = (every: number, weekDay: WeekDay) => pipe(mockShift, withShiftRepeat({ frequency: RepeatFrequency.WEEKLY, every, weekDay: [weekDay] }));

describe('ShiftService', () => {
  describe('create', () => {
    let shiftInput: ShiftInput;

    describe('error', () => {
      beforeEach(() => {
        shiftInput = makeShiftInput('2021-10-10T08:00:00.000Z', '2021-10-10T09:00:00.000Z', 'jobID', 'workplaceID', 'profileID');
      });

      it('should throw error when input missed required props', async () => {
        shiftInput = makeShiftInput('', '', '', '', '');
        try {
          await shiftService.create(shiftInput);
        } catch (e) {
          expect(e.errCode).toEqual(ErrorCodeConst.Validation);
          ['start', 'end', 'job', 'workplace', 'profile'].forEach((field) => expect(e.errors).toHaveProperty(field));
        }
      });

      it('should throw job and workplace error when they are not valid', async () => {
        jest.spyOn(jobServiceMock, 'get').mockImplementation(async () => undefined);
        jest.spyOn(workplaceServiceMock, 'get').mockImplementation(async () => undefined);

        try {
          await shiftService.create(shiftInput);
        } catch (e) {
          ['job', 'workplace'].forEach((field) => expect(e.errors).toHaveProperty(field));
          ['start', 'end', 'profile'].forEach((field) => expect(e.errors).not.toHaveProperty(field));
        }
      });

      it('should throw start and end error when they are not valid', async () => {
        jest.spyOn(jobServiceMock, 'get').mockImplementation(async () => mockJob('1'));
        jest.spyOn(workplaceServiceMock, 'get').mockImplementation(async () => mockWorkplace('1'));
        shiftInput.start = '2021-10-10T10:00:00.000Z';

        try {
          await shiftService.create(shiftInput);
        } catch (e) {
          ['start'].forEach((field) => expect(e.errors).toHaveProperty(field));
          ['job', 'workplace', 'profile'].forEach((field) => expect(e.errors).not.toHaveProperty(field));
        }

        // not exceed 24h
        shiftInput.end = '2021-10-11T10:00:01.000Z';
        try {
          await shiftService.create(shiftInput);
        } catch (e) {
          ['end'].forEach((field) => expect(e.errors).toHaveProperty(field));
        }
      });

      it('should throw error when alert is invalid', async () => {
        shiftInput.alert = -1;

        try {
          await shiftService.create(shiftInput);
        } catch (e) {
          ['alert'].forEach((field) => expect(e.errors).toHaveProperty(field));
        }
      });

      it('should throw error when repeat is invalid', async () => {
        jest.spyOn(jobServiceMock, 'get').mockImplementation(async () => mockJob('1'));
        jest.spyOn(workplaceServiceMock, 'get').mockImplementation(async () => mockWorkplace('1'));

        shiftInput.repeat = { frequency: RepeatFrequency.WEEKLY, every: 0 };
        try {
          await shiftService.create(shiftInput);
        } catch (e) {
          ['repeat'].forEach((field) => expect(e.errors).toHaveProperty(field));
        }
      });

      it('should throw error when duplicate shift', async () => {
        jest.spyOn(jobServiceMock, 'get').mockImplementation(async () => mockJob('1'));
        jest.spyOn(workplaceServiceMock, 'get').mockImplementation(async () => mockWorkplace('1'));
        jest.spyOn(shiftServiceMock, 'listShiftsByProfileID').mockImplementation(async () => ([mockShift({id: '1', start: shiftInput.start, end: shiftInput.end})]));

        try {
          await shiftService.create(shiftInput);
        } catch (e) {
          ['start'].forEach((field) => expect(e.errors).toHaveProperty(field));
        }
      });
    });

    describe('success', () => {
      beforeEach(() => {
        shiftInput = makeShiftInput('2021-10-10T08:00:00.000Z', '2021-10-10T09:00:00.000Z', 'jobID', 'workplaceID', 'profileID');
      });

      it('should create shift success', async () => {
        jest.spyOn(jobServiceMock, 'get').mockImplementation(async () => mockJob('1'));
        jest.spyOn(workplaceServiceMock, 'get').mockImplementation(async () => mockWorkplace('1'));
        jest.spyOn(shiftServiceMock, 'listShiftsByProfileID').mockImplementation(async () => ([mockShift({id: '1', start: '2021-10-10T09:00:00.000Z', end: '2021-10-10T09:00:01.000Z' })]));
        jest.spyOn(dynamoDBServiceMock, 'put').mockImplementation(async() => ({}));
        jest.spyOn(dynamoDBServiceMock, 'update').mockImplementation(async() => ({ $response: null }));

        shiftInput.excepts = ['2021-10-10'];
        await shiftService.create(shiftInput);
      });
    });
  });

  describe('validateEventRangeOverlapShifts', () => {
    let shiftInput: ShiftInput;

    describe('error', () => {
      beforeEach(() => {
        shiftInput = makeShiftInput('2021-10-10T08:00:00.000Z', '2021-10-10T09:00:00.000Z', 'jobID', 'workplaceID', 'profileID');
        jest.spyOn(workplaceServiceMock, 'get').mockImplementation(async () => mockWorkplace('1'));
      });

      describe('with none repeat', () => {
        it('should return error when time overlaps', async () => {
          const shifts = [mockShift({ id: '1', start: '2021-10-10T07:00:00.000Z', end: '2021-10-10T08:00:01.000Z' })];
          const error = await shiftService.validateEventRangeOverlapShifts(new Date(shiftInput.start), new Date(shiftInput.end), null, new Date('2021-10-10T08:00:00.000Z'), new Date('2022-10-10T08:00:00.000Z'), 0, [], shifts);

          expect(error).not.toEqual(undefined);
        });
      });

      describe('with repeat', () => {
        it('should return error when time overlaps with other shifts repeat', async () => {
          const shifts = [
            mockRepeatDayShift(1)({ id: '1', start: '2021-10-09T08:59:00.000Z', end: '2021-10-09T09:00:01.000Z' })
          ];

          const error = await shiftService.validateEventRangeOverlapShifts(new Date(shiftInput.start), new Date(shiftInput.end), null, new Date('2021-10-10T08:00:00.000Z'), new Date('2022-10-10T08:00:00.000Z'), 0, [], shifts);

          expect(error).not.toEqual(undefined);
        });

        it('should return error when shift repeat time overlaps with other shifts repeat', async () => {
          const shifts = [
            mockRepeatWeeklyShift(1, WeekDay.SATURDAY)({ id: '1', start: '2021-10-08T07:00:00.000Z', end: '2021-10-08T08:00:00.000Z' }),
            mockRepeatDayShift(1)({ id: '2', start: '2021-11-11T08:59:00.000Z', end: '2021-11-11T09:00:01.000Z' })
          ];
          shiftInput.repeat = { frequency: RepeatFrequency.DAILY, every: 1 };

          const error = await shiftService.validateEventRangeOverlapShifts(new Date(shiftInput.start), new Date(shiftInput.end), shiftInput.repeat, new Date('2021-10-10T08:00:00.000Z'), new Date('2022-10-10T08:00:00.000Z'), 0, [], shifts);

          expect(error).not.toEqual(undefined);
        });
      });
    });

    describe('success', () => {
      beforeEach(() => {
        shiftInput = makeShiftInput('2021-10-10T08:00:00.000Z', '2021-10-10T09:00:00.000Z', 'jobID', 'workplaceID', 'profileID');
        jest.spyOn(workplaceServiceMock, 'get').mockImplementation(async () => mockWorkplace('1'));
      });

      describe('with none repeat', () => {
        it('should return none-error when time does not overlaps', async () => {
          const shifts = [mockShift({ id: '1', start: '2021-10-10T09:00:00.000Z', end: '2021-10-10T10:00:00.000Z' })];
          const error = await shiftService.validateEventRangeOverlapShifts(new Date(shiftInput.start), new Date(shiftInput.end), null, new Date('2021-10-10T08:00:00.000Z'), new Date('2022-10-10T08:00:00.000Z'), 0, [], shifts);

          expect(error).toEqual(undefined);
        });

        it('should return none-error when the time overlaps was in the excepts', async () => {
          const shifts = [
            pipe(mockShift, withShiftExcepts(['2021-10-10']))({ id: '1', start: '2021-10-10T08:00:00.000Z', end: '2021-10-10T09:00:00.000Z' })
          ];

          const error = await shiftService.validateEventRangeOverlapShifts(new Date(shiftInput.start), new Date(shiftInput.end), null, new Date('2021-10-10T08:00:00.000Z'), new Date('2022-10-10T08:00:00.000Z'), 0, [], shifts);

          expect(error).toEqual(undefined);
        });
      });

      describe('with repeat', () => {
        it('should return none-error when time does not overlaps with other shifts repeat', async () => {
          const shifts = [
            mockRepeatDayShift(1)({ id: '1', start: '2021-10-09T09:00:00.000Z', end: '2021-10-09T09:00:01.000Z' }),
            mockRepeatDayShift(1)({ id: '2', start: '2021-10-09T07:00:00.000Z', end: '2021-10-09T08:00:00.000Z' })
          ];

          const error = await shiftService.validateEventRangeOverlapShifts(new Date(shiftInput.start), new Date(shiftInput.end), null, new Date('2021-10-10T08:00:00.000Z'), new Date('2022-10-10T08:00:00.000Z'), 0, [], shifts);

          expect(error).toEqual(undefined);
        });

        it('should return none-error when shift repeat time does not overlaps with other shifts repeat', async () => {
          const shifts = [
            mockRepeatDayShift(1)({ id: '1', start: '2021-11-11T07:00:00.000Z', end: '2021-11-11T08:00:00.000Z' })
          ];
          shiftInput.repeat = { frequency: RepeatFrequency.DAILY, every: 1 };

          const error = await shiftService.validateEventRangeOverlapShifts(new Date(shiftInput.start), new Date(shiftInput.end), shiftInput.repeat, new Date('2021-10-10T08:00:00.000Z'), new Date('2022-10-10T08:00:00.000Z'), 0, [], shifts);

          expect(error).toEqual(undefined);
        });
      });
    });
  });

  describe('getShiftEventDetail', () => {
    describe('success', () => {
      let shift: Shift;

      beforeEach(() => {
        shift = mockRepeatDayShift(1)({ id: '1', start: '2021-10-10T07:00:00.000Z', end: '2021-10-10T08:00:00.000Z' });
      });

      it('should return a shift event', () => {
        const shiftEvent = shiftServiceMock.getShiftEventDetail({ shift, start: new Date("2021-10-11T07:00:00.000Z") });
        expect(shiftEvent.start).toEqual(new Date("2021-10-11T07:00:00.000Z"));
        expect(shiftEvent.end).toEqual(new Date("2021-10-11T08:00:00.000Z"));
      });

      it('should return undefined if the shift is over endRepeat time', () => {
        shift.endRepeat = '2021-10-11';
        const shiftEvent = shiftServiceMock.getShiftEventDetail({ shift, start: new Date('2021-10-12T07:00:00.000Z') });
        expect(shiftEvent).toBe(undefined);
      });

      it('should return undefined if the shift is in the except list', () => {
        shift.excepts = { values: ['2021-10-11', '2021-10-12'], wrapperName: 'mock', type: 'mock' };
        let shiftEvent = shiftServiceMock.getShiftEventDetail({ shift, start: new Date('2021-10-11T07:00:00.000Z') });
        expect(shiftEvent).toBe(undefined);
        shiftEvent = shiftServiceMock.getShiftEventDetail({ shift, start: new Date('2021-10-12T07:00:00.000Z') });
        expect(shiftEvent).toBe(undefined);
        shiftEvent = shiftServiceMock.getShiftEventDetail({ shift, start: new Date('2021-10-13T07:00:00.000Z') });
        expect(shiftEvent).not.toBe(undefined);
      });
    });
  });

  describe('deleteShiftEvent', () => {
    let shiftEventDetail: ShiftEventDetail;

    beforeEach(() => {
      shiftEventDetail = {
        shift: mockShift({ id: '1', start: '2021-10-10T07:00:00.000Z', end: '2021-10-10T08:00:00.000Z' }),
        start: new Date('2021-10-13T08:00:00.000Z')
      };
    });

    describe('with none repeat', () => {
      it('should delete the record in DB', async () => {
        const deleteFn = jest.spyOn(dynamoDBServiceMock, 'delete').mockReturnValue(Promise.resolve({}));
        await shiftService.deleteShiftEvent(shiftEventDetail);
        expect(deleteFn).toBeCalled();
      });
    });

    describe('with repeat', () => {
      beforeEach(() => {
        shiftEventDetail = {
          shift: mockRepeatDayShift(1)({ id: '1', start: '2021-10-10T07:00:00.000Z', end: '2021-10-10T08:00:00.000Z' }),
          start: new Date('2021-10-24T07:00:00.000Z')
        };
      });

      it('should mark the shift event to except list', async () => {
        const updateFn = jest.spyOn(dynamoDBServiceMock, 'update').mockImplementation();
        await shiftService.deleteShiftEvent(shiftEventDetail);
        expect(updateFn).toBeCalled();
      });

      it('should adjust end-repeat time if the shift deleted is the last shift', async () => {
        shiftEventDetail.shift.endRepeat = '2021-10-24'
        const updateFn = jest.spyOn(dynamoDBServiceMock, 'update').mockImplementation();
        await shiftService.deleteShiftEvent(shiftEventDetail);
        expect(updateFn).toBeCalled();
      });
    });
  });

  describe('deleteShiftEventsInFuture', () => {
    let shiftEventDetail: ShiftEventDetail;

    beforeEach(() => {
      shiftEventDetail = {
        shift: mockRepeatDayShift(1)({ id: '1', start: '2021-10-10T07:00:00.000Z', end: '2021-10-10T08:00:00.000Z' }),
        start: new Date('2021-10-13T08:00:00.000Z')
      };
    });

    describe('error', () => {
      it('should throw error if this shift is none repeat', async () => {
        shiftEventDetail.shift.repeat = null;
        try {
          await shiftService.deleteShiftEventsInFuture(shiftEventDetail);
        } catch (e) {
          expect(e.errCode).toEqual(ErrorCodeConst.BadRequest);
        }
      });
    });

    describe('success', () => {
      it('should throw error if this shift is none repeat', async () => {
        shiftEventDetail.shift.repeat = null;
        try {
          await shiftService.deleteShiftEventsInFuture(shiftEventDetail);
        } catch (e) {
          expect(e.errCode).toEqual(ErrorCodeConst.BadRequest);
        }
      });

      it('should delete shift record when delete shift from beginning', async () => {
        shiftEventDetail.start = new Date('2021-10-10T07:00:00.000Z');

        const deleteFn = jest.spyOn(dynamoDBServiceMock, 'delete').mockImplementation();
        const deleteChildrenShiftsFromFn = jest.spyOn(shiftService, 'deleteChildrenShiftsFrom').mockImplementation();
        await shiftService.deleteShiftEventsInFuture(shiftEventDetail);
        expect(deleteFn).toBeCalled();
        expect(deleteChildrenShiftsFromFn).toBeCalled();
      });

      it('should delete shift record when delete shift from beginning after marking delete first shift', async () => {
        shiftEventDetail.start = new Date('2021-10-11T07:00:00.000Z');
        shiftEventDetail.shift.excepts = { values: ['2021-10-10'], wrapperName: 'mock', type: 'mock' };

        const deleteFn = jest.spyOn(dynamoDBServiceMock, 'delete').mockImplementation();
        const deleteChildrenShiftsFromFn = jest.spyOn(shiftService, 'deleteChildrenShiftsFrom').mockImplementation();
        await shiftService.deleteShiftEventsInFuture(shiftEventDetail);
        expect(deleteFn).toBeCalled();
        expect(deleteChildrenShiftsFromFn).toBeCalled();
      });

      it('should mark endRepeat', async () => {
        const updateFn = jest.spyOn(dynamoDBServiceMock, 'update').mockImplementation();
        const deleteChildrenShiftsFromFn = jest.spyOn(shiftService, 'deleteChildrenShiftsFrom').mockImplementation();
        await shiftService.deleteShiftEventsInFuture(shiftEventDetail);
        expect(updateFn).toBeCalled();
        expect(deleteChildrenShiftsFromFn).toBeCalled();
      });
    });
  });

  describe('adjustAllShiftsToSavingTime', () => {
    let shiftSTD1: Shift;
    let shiftSTD2: Shift;
    let shiftDST1: Shift;
    let shiftDST2: Shift;

    beforeEach(() => {
      shiftSTD1 = mockRepeatDayShift(1)({
        id: '1',
        start: '2022-01-10T08:00:00.000Z',
        end: '2022-01-10T09:00:00.000Z',
        ianaTz: mockTz,
        savingTime: SavingTime.STD
      });
      shiftSTD2 = mockRepeatDayShift(1)({
        id: '2',
        start: '2022-01-11T09:00:00.000Z',
        end: '2022-01-11T10:00:00.000Z',
        ianaTz: mockTz,
        savingTime: SavingTime.STD
      });
      shiftDST1 = mockRepeatDayShift(1)({
        id: '3',
        start: '2022-04-10T08:00:00.000Z',
        end: '2022-04-10T09:00:00.000Z',
        ianaTz: mockTz,
        savingTime: SavingTime.DST
      });
      shiftDST2 = mockRepeatDayShift(1)({
        id: '4',
        start: '2022-04-11T09:00:00.000Z',
        end: '2022-04-11T10:00:00.000Z',
        ianaTz: mockTz,
        savingTime: SavingTime.DST
      });
    });

    describe('success', () => {
      it('should adjust to DST time', async () => {
        jest.spyOn(shiftServiceMock, 'allShiftsBySavingTime').mockImplementation(async () => ([shiftSTD1, shiftSTD2]));
        jest.spyOn(dynamoDBServiceMock, 'batchPut').mockImplementation(async () => (null));

        const rs = await shiftService.adjustAllShiftsToSavingTime(SavingTime.DST);
        expect(rs.length).toEqual(2);
        expect(rs[0].start).toEqual('2022-01-10T09:00:00.000Z');
        expect(rs[0].end).toEqual('2022-01-10T10:00:00.000Z');
        expect(rs[1].start).toEqual('2022-01-11T10:00:00.000Z');
        expect(rs[1].end).toEqual('2022-01-11T11:00:00.000Z');
      });

      it('should update excepts and endRepeat if the day changed when adjust to DST time', async () => {
        shiftSTD1.start = '2022-01-09T23:00:00.000Z';
        shiftSTD1.end = '2022-01-10T00:00:00.000Z';
        shiftSTD1.excepts = { values: ["2022-01-11", "2022-01-13"], wrapperName: 'mock', type: 'mock' };
        shiftSTD1.endRepeat = "2022-01-14";

        shiftSTD2.excepts = { values: ["2022-06-01"], wrapperName: 'mock', type: 'mock' };
        shiftSTD2.endRepeat = "2022-07-01";
        jest.spyOn(shiftServiceMock, 'allShiftsBySavingTime').mockImplementation(async () => ([shiftSTD1, shiftSTD2]));
        jest.spyOn(dynamoDBServiceMock, 'batchPut').mockImplementation(async () => (null));

        const rs = await shiftService.adjustAllShiftsToSavingTime(SavingTime.DST);
        expect(rs.length).toEqual(2);
        expect(rs[0].start).toEqual('2022-01-10T00:00:00.000Z');
        expect(rs[0].end).toEqual('2022-01-10T01:00:00.000Z');
        expect(rs[0].excepts.values).toEqual(["2022-01-12", "2022-01-14"]);
        expect(rs[0].endRepeat).toEqual("2022-01-15");
        expect(rs[1].start).toEqual('2022-01-11T10:00:00.000Z');
        expect(rs[1].end).toEqual('2022-01-11T11:00:00.000Z');
        expect(rs[1].excepts.values).toEqual(["2022-06-01"]);
        expect(rs[1].endRepeat).toEqual("2022-07-01");
      });

      it('should adjust to STD time', async () => {
        jest.spyOn(shiftServiceMock, 'allShiftsBySavingTime').mockImplementation(async () => ([shiftDST1, shiftDST2]));
        jest.spyOn(dynamoDBServiceMock, 'batchPut').mockImplementation(async () => (null));

        const rs = await shiftService.adjustAllShiftsToSavingTime(SavingTime.STD);
        expect(rs.length).toEqual(2);
        expect(rs[0].start).toEqual('2022-04-10T07:00:00.000Z');
        expect(rs[0].end).toEqual('2022-04-10T08:00:00.000Z');
        expect(rs[1].start).toEqual('2022-04-11T08:00:00.000Z');
        expect(rs[1].end).toEqual('2022-04-11T09:00:00.000Z');
      });

      it('should update excepts and endRepeat if the day changed when adjust to STD time', async () => {
        shiftDST1.start = '2022-05-01T00:00:00.000Z';
        shiftDST1.end = '2022-05-01T01:00:00.000Z';
        shiftDST1.excepts = { values: ["2022-06-01", "2022-06-13"], wrapperName: 'mock', type: 'mock' };
        shiftDST1.endRepeat = "2022-07-01";

        shiftDST2.excepts = { values: ["2022-06-01"], wrapperName: 'mock', type: 'mock' };
        shiftDST2.endRepeat = "2022-07-01";
        jest.spyOn(shiftServiceMock, 'allShiftsBySavingTime').mockImplementation(async () => ([shiftDST1, shiftDST2]));
        jest.spyOn(dynamoDBServiceMock, 'batchPut').mockImplementation(async () => (null));

        const rs = await shiftService.adjustAllShiftsToSavingTime(SavingTime.STD);
        expect(rs.length).toEqual(2);
        expect(rs[0].start).toEqual('2022-04-30T23:00:00.000Z');
        expect(rs[0].end).toEqual('2022-05-01T00:00:00.000Z');
        expect(rs[0].excepts.values).toEqual(["2022-05-31", "2022-06-12"]);
        expect(rs[0].endRepeat).toEqual("2022-06-30");
        expect(rs[1].start).toEqual('2022-04-11T08:00:00.000Z');
        expect(rs[1].end).toEqual('2022-04-11T09:00:00.000Z');
        expect(rs[1].excepts.values).toEqual(["2022-06-01"]);
        expect(rs[1].endRepeat).toEqual("2022-07-01");
      });
    });
  });
});
