import { Repeat, RepeatFrequency, WeekDay } from "@swm-core/interfaces/repeat.interface";
import { getNextDate, getTzISOString, toDateString } from "@swm-core/utils/date.util";
import { pipe } from "@swm-core/utils/fn.util";
import { ShiftRepeatService } from "./shift-repeat.service";

interface ShiftRepeatInput {
  start: Date;
  end: Date;
  repeat?: Repeat;
  endRepeat?: Date;
  excepts?: Date[];
}

const shiftRepeatService = new ShiftRepeatService();

// FACTORY
const shiftRangeFactory = (input: ShiftRepeatInput): ShiftRepeatInput => ({ ...input });
const shiftRepeatFactory = (repeat: Repeat) => (input: ShiftRepeatInput): ShiftRepeatInput => ({ ...input, repeat });
const shiftDailyFactory = (every: number) => pipe(shiftRangeFactory, shiftRepeatFactory({ frequency: RepeatFrequency.DAILY, every }));
const shiftWeeklyFactory = (every: number, weekDay: WeekDay) => pipe(shiftRangeFactory, shiftRepeatFactory({ frequency: RepeatFrequency.WEEKLY, every, weekDay: [weekDay] }));
const shiftMonthlyFactory = (every: number, each: number) => pipe(shiftRangeFactory, shiftRepeatFactory({ frequency: RepeatFrequency.MONTHLY, every, each: [each] }));
const shiftEndRepeatFactory = (date: Date) => (input: ShiftRepeatInput) => ({ ...input, endRepeat: date });
// END FACTORY

describe('ShiftRepeatService', () => {
  describe('listShiftEventsByDate', () => {
    let shiftRepeatInput: ShiftRepeatInput;

    describe('with none repeat', () => {
      beforeEach(() => {
        shiftRepeatInput = shiftRangeFactory({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });
      });

      describe('success', () => {
        it('should return undefined when the time is greater than the end time', () => {
          const time = new Date('2021-10-20T11:30:01.000Z');
          expect(shiftRepeatService.listShiftEventsByDate(null, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
            .toEqual(undefined);
        });

        it('should return undefined when the date of time is in the lists of excepts', () => {
          const time = new Date('2021-10-20T11:27:01.000Z');
          expect(shiftRepeatService.listShiftEventsByDate(null, shiftRepeatInput.start, shiftRepeatInput.end, time, null, [new Date('2021-10-20')]))
            .toEqual(undefined);
        });

        it('should return shift event success', () => {
          const time = new Date('2021-10-20T11:27:01.000Z');
          expect(shiftRepeatService.listShiftEventsByDate(null, shiftRepeatInput.start, shiftRepeatInput.end, time, null))
            .toEqual({
              start: shiftRepeatInput.start,
              end: shiftRepeatInput.end
            });
        });
      });
    });

    describe('with repeat', () => {
      describe('daily', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftDailyFactory(1)({
            start: new Date('2021-10-20T11:27:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        describe('success', () => {
          it('should return the shift event when that day has shift', () => {
            let time = new Date('2021-10-20T11:30:01.000Z');
            expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
              .toEqual({
                start: shiftRepeatInput.start,
                end: shiftRepeatInput.end,
              });

            time = new Date('2021-10-21T11:30:01.000Z');
            expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
              .toEqual({
                start: getNextDate(shiftRepeatInput.start),
                end: getNextDate(shiftRepeatInput.end)
              });
          });

          it('should return undefined when that day has no shift', () => {
            const time = new Date('2021-10-19T11:30:01.000Z');
            expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
              .toEqual(undefined);
          });
        });
      });

      describe('weekly', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftWeeklyFactory(1, WeekDay.WEDNESDAY)({
            start: new Date('2021-10-20T11:27:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        it('should return the shift event when that day has shift', () => {
          let time = new Date('2021-10-20T11:30:01.000Z');
          expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
            .toEqual({
              start: shiftRepeatInput.start,
              end: shiftRepeatInput.end
            });

          time = getNextDate(time, 8);
          expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
            .toEqual({
              start: getNextDate(shiftRepeatInput.start, 7),
              end: getNextDate(shiftRepeatInput.end, 7)
            });
        });

        it('should return undefined when that day has no shift', () => {
          const time = new Date('2021-10-19T11:30:01.000Z');
          expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
            .toEqual(undefined);
        });
      });

      describe('monthly', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftMonthlyFactory(1, 20)({
            start: new Date('2021-10-20T11:27:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        it('should return the shift event when that day has shift', () => {
          let time = new Date('2021-10-20T11:30:01.000Z');
          expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
            .toEqual({
              start: shiftRepeatInput.start,
              end: shiftRepeatInput.end
            });

          time = getNextDate(time, 62);
          expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
            .toEqual({
              start: getNextDate(shiftRepeatInput.start, 61),
              end: getNextDate(shiftRepeatInput.end, 61)
            });
        });

        it('should return undefined when that day has no shift', () => {
          const time = new Date('2021-10-19T11:30:01.000Z');
          expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, []))
            .toEqual(undefined);
        });
      });

      it('should return undefined when that day has shift but the time is greater than the end-repeat', () => {
        const shiftRepeatInput: any = pipe(shiftDailyFactory(1), shiftEndRepeatFactory(new Date('2021-10-21')))({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });

        const time = new Date('2021-10-22T11:30:01.000Z');
        expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, shiftRepeatInput.endRepeat, []))
          .toEqual(undefined);
      });

      it('should return undefined when the date of time is in the lists of excepts', () => {
        const shiftRepeatInput: any = pipe(shiftDailyFactory(1), shiftEndRepeatFactory(new Date('2021-10-23')))({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });

        const time = new Date('2021-10-22T11:30:01.000Z');
        expect(shiftRepeatService.listShiftEventsByDate(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, shiftRepeatInput.endRepeat, [new Date('2021-10-22')]))
          .toEqual(undefined);
      });
    });
  });

  describe('getNextEvent', () => {
    let shiftRepeatInput: ShiftRepeatInput;

    describe('with none repeat', () => {

      beforeEach(() => {
        shiftRepeatInput = shiftRangeFactory({
          start: new Date('2021-10-20T11:00:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });
      });

      describe('success', () => {
        it('should return undefined when the time is greater than the end time', () => {
          const time = new Date('2021-10-20T11:00:01.000Z');
          expect(shiftRepeatService.getNextEvent(null, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 1, []))
            .toEqual(undefined);
        });

        it('should return undefined when the date of time is in the lists of excepts', () => {
          const time = new Date('2021-10-20T11:00:00.000Z');
          expect(shiftRepeatService.getNextEvent(null, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 1, [new Date('2021-10-20')]))
            .toEqual(undefined);
        });

        it('should return the current shift event', () => {
          const time = new Date('2021-10-20T11:00:00.000Z');
          expect(shiftRepeatService.getNextEvent(null, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 0, []))
            .toEqual({
              start: shiftRepeatInput.start,
              end: shiftRepeatInput.end
            });
        });
      });
    });

    describe('with repeat', () => {
      describe('daily', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftDailyFactory(1)({
            start: new Date('2021-10-20T11:00:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        describe('success', () => {
          it('should return the next shift event with step', () => {
            const time = new Date('2021-10-20T11:00:01.000Z');
            expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 1, []))
              .toEqual({
                start: getNextDate(shiftRepeatInput.start, 1),
                end: getNextDate(shiftRepeatInput.end, 1)
              });

            // test with step 2
            expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 2, []))
              .toEqual({
                start: getNextDate(shiftRepeatInput.start, 2),
                end: getNextDate(shiftRepeatInput.end, 2)
              });
          });

          it('should return undefined when that day has no shift', () => {
            const time = new Date('2021-10-20T10:59:01.000Z');
            expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 0, []))
              .toEqual(undefined);
          });
        });
      });

      describe('weekly', () => {
        let shiftRepeatInput: any;

        beforeEach(() => {
          shiftRepeatInput = shiftWeeklyFactory(2, WeekDay.WEDNESDAY)({
            start: new Date('2021-10-20T11:00:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        describe('success', () => {
          it('should return the next shift event with step', () => {
            const time = new Date('2021-10-20T11:00:01.000Z');
            expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 0, []))
              .toEqual({
                start: shiftRepeatInput.start,
                end: shiftRepeatInput.end
              });

            expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 1, []))
              .toEqual({
                start: getNextDate(shiftRepeatInput.start, 14),
                end: getNextDate(shiftRepeatInput.end, 14)
              });
          });
        });
      });

      describe('monthly', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftMonthlyFactory(1, 20)({
            start: new Date('2021-10-20T11:00:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        describe('success', () => {
          it('should return the next shift event with step', () => {
            const time = new Date('2021-10-20T11:00:01.000Z');
            expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, null, 1, []))
              .toEqual({
                start: getNextDate(shiftRepeatInput.start, 31),
                end: getNextDate(shiftRepeatInput.end, 31)
              });
          });
        });
      });

      it('should return undefined when that day has shift but the time is greater than the end-repeat', () => {
        shiftRepeatInput = pipe(shiftDailyFactory(1), shiftEndRepeatFactory(new Date('2021-10-21')))({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });

        const time = new Date('2021-10-21T11:30:01.000Z');
        expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, shiftRepeatInput.endRepeat, 1, []))
          .toEqual(undefined);
      });

      it('should return undefined when the date of time is in the lists of excepts and no next event', () => {
        shiftRepeatInput = pipe(shiftDailyFactory(1), shiftEndRepeatFactory(new Date('2021-10-23')))({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });

        const time = new Date('2021-10-22T11:30:01.000Z');
        expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, shiftRepeatInput.endRepeat, 1, [new Date('2021-10-23')]))
          .toEqual(undefined);
      });

      it('should return next event when the date of time is in the lists of excepts and has next event', () => {
        shiftRepeatInput = pipe(shiftDailyFactory(1), shiftEndRepeatFactory(new Date('2021-10-24')))({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });

        const time = new Date('2021-10-22T11:30:01.000Z');
        expect(shiftRepeatService.getNextEvent(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, time, shiftRepeatInput.endRepeat, 1, [new Date('2021-10-23')]))
          .toEqual({
            start: new Date('2021-10-24T11:27:00.000Z'),
            end: new Date('2021-10-24T11:30:00.000Z')
          });
      });
    });
  });

  describe('listShiftEventsWithRepeatRuleV2', () => {
    let shiftRepeatInput: ShiftRepeatInput;

    describe('with none repeat', () => {
      beforeEach(() => {
        shiftRepeatInput = shiftRangeFactory({
          start: new Date('2021-10-20T11:00:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });
      });

      describe('success', () => {
        it('should return shift events in range when tz = UTC', () => {
          const input = {
            rangeStart: new Date('2021-10-01'),
            rangeEnd: new Date('2021-10-31'),
            tz: 0
          };

          expect(shiftRepeatService.listShiftEventsWithRepeatRuleV2(null, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, []))
            .toEqual([{
              startDate: shiftRepeatInput.start,
              endDate: shiftRepeatInput.end,
              range: [{
                start: shiftRepeatInput.start,
                end: shiftRepeatInput.end
              }]
            }]);
        });

        it('should return shift events in range when tz > 0', () => {
          const input = {
            rangeStart: new Date('2021-10-20'),
            rangeEnd: new Date('2021-10-20'),
            tz: 240 // GMT +4
          };

          const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(null, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, []);
          expect(rs.length).toEqual(1);
          expect(new Date(getTzISOString(rs[0].startDate, input.tz))).toEqual(shiftRepeatInput.start);
          expect(new Date(getTzISOString(rs[0].endDate, input.tz))).toEqual(shiftRepeatInput.end);
          expect(new Date(getTzISOString(rs[0].range[0].start, input.tz))).toEqual(shiftRepeatInput.start);
          expect(new Date(getTzISOString(rs[0].range[0].end, input.tz))).toEqual(shiftRepeatInput.end);
        });

        it('should return shift events in range when tz < 0', () => {
          const input = {
            rangeStart: new Date('2021-10-20'),
            rangeEnd: new Date('2021-10-20'),
            tz: -240 // GMT -4
          };

          const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(null, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, []);
          expect(rs.length).toEqual(1);
          expect(new Date(getTzISOString(rs[0].startDate, input.tz))).toEqual(shiftRepeatInput.start);
          expect(new Date(getTzISOString(rs[0].endDate, input.tz))).toEqual(shiftRepeatInput.end);
          expect(new Date(getTzISOString(rs[0].range[0].start, input.tz))).toEqual(shiftRepeatInput.start);
          expect(new Date(getTzISOString(rs[0].range[0].end, input.tz))).toEqual(shiftRepeatInput.end);
        });

        it('should return empty shift events when the shift is out of range', () => {
          const input = {
            rangeStart: new Date('2021-10-21'),
            rangeEnd: new Date('2021-10-21'),
            tz: 0
          };
          expect(shiftRepeatService.listShiftEventsWithRepeatRuleV2(null, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, []))
            .toEqual([]);
        });

        it('should return empty shift events when they are in excepts list', () => {
          const input = {
            rangeStart: new Date('2021-10-20'),
            rangeEnd: new Date('2021-10-20'),
            tz: 0
          };
          expect(shiftRepeatService.listShiftEventsWithRepeatRuleV2(null, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, [new Date('2021-10-20')]))
            .toEqual([]);
        });
      });
    });

    describe('with repeat', () => {
      describe('daily', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftDailyFactory(1)({
            start: new Date('2021-10-20T11:00:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        describe('success', () => {
          it('should return shift events in the range when tz = utc', () => {
            const input = {
              rangeStart: new Date('2021-10-19'),
              rangeEnd: new Date('2021-10-22')
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, 0, null, []);
            expect(rs.length).toEqual(3);
            expect(rs[0]).toEqual({
              startDate: new Date('2021-10-20T11:00:00.000Z'),
              endDate: new Date('2021-10-20T11:30:00.000Z'),
              range: [{
                start: new Date('2021-10-20T11:00:00.000Z'),
                end: new Date('2021-10-20T11:30:00.000Z')
              }]
            });
            expect(rs[2]).toEqual({
              startDate: new Date('2021-10-22T11:00:00.000Z'),
              endDate: new Date('2021-10-22T11:30:00.000Z'),
              range: [{
                start: new Date('2021-10-22T11:00:00.000Z'),
                end: new Date('2021-10-22T11:30:00.000Z')
              }]
            });
          });

          it('should return shift events in the range when tz < 0', () => {
            shiftRepeatInput = shiftDailyFactory(1)({
              start: new Date('2021-10-20T01:00:00.000Z'),
              end: new Date('2021-10-20T01:30:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-19'),
              rangeEnd: new Date('2021-10-22'),
              tz: -120
            };
            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, []);
            expect(rs.length).toEqual(4);
            expect(toDateString(rs[0].startDate)).toEqual('2021-10-19');
            expect(toDateString(rs[3].startDate)).toEqual('2021-10-22');
          });

          it('should return shift events in the range when tz > 0', () => {
            shiftRepeatInput = shiftDailyFactory(1)({
              start: new Date('2021-10-20T23:00:00.000Z'),
              end: new Date('2021-10-20T23:30:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-19'),
              rangeEnd: new Date('2021-10-22'),
              tz: 120
            };
            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, []);
            expect(rs.length).toEqual(2);
            expect(toDateString(rs[0].startDate)).toEqual('2021-10-21');
            expect(toDateString(rs[1].startDate)).toEqual('2021-10-22');
          });

          it('should return shift events in the range when the Shift take 2 days', () => {
            shiftRepeatInput = shiftDailyFactory(1)({
              start: new Date('2021-10-20T23:00:00.000Z'),
              end: new Date('2021-10-21T00:30:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-19'),
              rangeEnd: new Date('2021-10-22')
            };
            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, 0, null, []);
            expect(rs.length).toEqual(3);
            expect(toDateString(rs[0].startDate)).toEqual('2021-10-20');
            expect(toDateString(rs[0].endDate)).toEqual('2021-10-21');
            expect(toDateString(rs[2].startDate)).toEqual('2021-10-22');
            expect(toDateString(rs[2].endDate)).toEqual('2021-10-23');
          });

          it('should return shift events in the range when the Shift take 2 days with tz', () => {
            shiftRepeatInput = shiftDailyFactory(1)({
              start: new Date('2021-10-20T22:00:00.000Z'),
              end: new Date('2021-10-20T23:30:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-19'),
              rangeEnd: new Date('2021-10-22'),
              tz: 60
            };
            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, null, []);
            expect(rs.length).toEqual(3);
            expect(toDateString(rs[0].startDate)).toEqual('2021-10-20');
            expect(toDateString(rs[0].endDate)).toEqual('2021-10-21');
            expect(toDateString(rs[2].startDate)).toEqual('2021-10-22');
            expect(toDateString(rs[2].endDate)).toEqual('2021-10-23');
          });

          it('should return empty when that range has no shift', () => {
            const input = {
              rangeStart: new Date('2021-10-18'),
              rangeEnd: new Date('2021-10-19')
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, 0, null, []);
            expect(rs.length).toEqual(0);
          });
        });
      });

      describe('weekly', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftWeeklyFactory(2, WeekDay.WEDNESDAY)({
            start: new Date('2021-10-20T11:00:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        describe('success', () => {
          it('should return list shift events', () => {
            const input = {
              rangeStart: new Date('2021-10-19'),
              rangeEnd: new Date('2021-11-10')
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, 0, null, []);
            expect(rs.length).toEqual(2);
          });

          it('should return the shift events with tz < 0', () => {
            shiftRepeatInput = pipe(shiftWeeklyFactory(2, WeekDay.FRIDAY), shiftEndRepeatFactory(new Date('2021-10-22')))({
              start: new Date('2021-10-22T03:46:38.703Z'),
              end: new Date('2021-10-22T07:20:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-21'),
              rangeEnd: new Date('2021-10-23'),
              tz: -240
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, shiftRepeatInput.endRepeat, []);
            expect(rs.length).toEqual(1);
          });

          it('should return the shift events with tz > 0', () => {
            shiftRepeatInput = pipe(shiftWeeklyFactory(2, WeekDay.FRIDAY), shiftEndRepeatFactory(new Date('2021-10-23')))({
              start: new Date('2021-10-22T23:46:38.703Z'),
              end: new Date('2021-10-23T07:20:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-21'),
              rangeEnd: new Date('2021-10-24'),
              tz: 420
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, shiftRepeatInput.endRepeat, []);
            expect(rs.length).toEqual(1);
          });
        });
      });

      describe('monthly', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftMonthlyFactory(1, 20)({
            start: new Date('2021-10-20T11:00:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        describe('success', () => {
          it('should return the next shift event with step', () => {
            const input = {
              rangeStart: new Date('2021-10-19'),
              rangeEnd: new Date('2021-12-20')
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, 0, null, []);
            expect(rs.length).toEqual(3);
          });

          it('should return the shift events with tz < 0', () => {
            shiftRepeatInput = pipe(shiftMonthlyFactory(2, 22), shiftEndRepeatFactory(new Date('2021-10-22')))({
              start: new Date('2021-10-22T03:46:38.703Z'),
              end: new Date('2021-10-22T07:20:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-21'),
              rangeEnd: new Date('2021-10-23'),
              tz: -240
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, shiftRepeatInput.endRepeat, []);

            expect(rs.length).toEqual(1);
          });

          it('should return the shift events with tz > 0', () => {
            shiftRepeatInput = pipe(shiftMonthlyFactory(2, 22), shiftEndRepeatFactory(new Date('2021-10-23')))({
              start: new Date('2021-10-22T23:46:38.703Z'),
              end: new Date('2021-10-23T07:20:00.000Z')
            });
            const input = {
              rangeStart: new Date('2021-10-21'),
              rangeEnd: new Date('2021-10-24'),
              tz: 420
            };

            const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, input.tz, shiftRepeatInput.endRepeat, []);
            expect(rs.length).toEqual(1);
          });
        });
      });

      it('should return shift events not include exceed days', () => {
        shiftRepeatInput = pipe(shiftDailyFactory(1), shiftEndRepeatFactory(new Date('2021-10-21')))({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });

        const input = {
          rangeStart: new Date('2021-10-20'),
          rangeEnd: new Date('2021-10-23')
        };

        const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, 0, shiftRepeatInput.endRepeat, []);
        expect(rs.length).toEqual(2);
      });

      it('should return shift events not include in the lists of excepts', () => {
        shiftRepeatInput = pipe(shiftDailyFactory(1), shiftEndRepeatFactory(new Date('2021-10-22')))({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });

        const input = {
          rangeStart: new Date('2021-10-20'),
          rangeEnd: new Date('2021-10-23')
        };

        const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, 0, shiftRepeatInput.endRepeat, [new Date('2021-10-20'), new Date('2021-10-21')]);
        expect(rs.length).toEqual(1);
      });

      it('should return shift events not include in the lists of excepts with tz', () => {
        shiftRepeatInput = pipe(shiftWeeklyFactory(2, WeekDay.FRIDAY))({
          start: new Date('2021-10-23T03:46:38.703Z'),
          end: new Date('2021-10-23T20:30:00.000Z')
        });

        const input = {
          rangeStart: new Date('2021-11-01'),
          rangeEnd: new Date('2021-11-10')
        };

        const rs = shiftRepeatService.listShiftEventsWithRepeatRuleV2(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, input.rangeStart, input.rangeEnd, -240, shiftRepeatInput.endRepeat, [new Date('2021-11-06')]);

        expect(rs.length).toEqual(0);
      });
    });
  });

  describe('checkDutyWithRepeatRule', () => {
    let shiftRepeatInput: ShiftRepeatInput;

    describe('with none repeat', () => {
      beforeEach(() => {
        shiftRepeatInput = shiftRangeFactory({
          start: new Date('2021-10-20T11:27:00.000Z'),
          end: new Date('2021-10-20T11:30:00.000Z')
        });
      });

      describe('success', () => {
        it('should return true when the time is in the shift range', () => {
          const times = [
            new Date('2021-10-20T11:27:00.000Z'),
            new Date('2021-10-20T11:30:00.000Z'),
            new Date('2021-10-20T11:27:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(true);
          });
        });

        it('should return false when the time is out the shift range', () => {
          const times = [
            new Date('2021-10-20T11:26:59.000Z'),
            new Date('2021-10-20T11:30:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(false);
          });
        });

        it('should return false when the time is in the list of excepts', () => {
          const times = [
            new Date('2021-10-20T11:27:00.000Z'),
            new Date('2021-10-20T11:30:00.000Z'),
            new Date('2021-10-20T11:27:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, [new Date('2021-10-20')]))
              .toEqual(false);
          });
        })
      });
    });

    describe('with repeat', () => {
      describe('daily', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftDailyFactory(1)({
            start: new Date('2021-10-20T11:27:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        it('should return true when the time is in the shift range', () => {
          const times = [
            new Date('2021-10-20T11:27:00.000Z'),
            new Date('2021-10-20T11:30:00.000Z'),
            new Date('2021-10-20T11:27:01.000Z'),
            new Date('2021-10-21T11:27:00.000Z'),
            new Date('2021-10-21T11:30:00.000Z'),
            new Date('2021-10-21T11:27:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(true);
          });
        });

        it('should return false when the time is out the shift range', () => {
          const times = [
            new Date('2021-10-20T11:26:59.000Z'),
            new Date('2021-10-20T11:30:01.000Z'),
            new Date('2021-10-21T11:26:59.000Z'),
            new Date('2021-10-21T11:30:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(false);
          });
        });
      });

      describe('weekly', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftWeeklyFactory(2, WeekDay.WEDNESDAY)({
            start: new Date('2021-10-20T11:27:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        it('should return true when the time is in the shift range', () => {
          const times = [
            new Date('2021-10-20T11:27:00.000Z'),
            new Date('2021-10-20T11:30:00.000Z'),
            new Date('2021-10-20T11:27:01.000Z'),
            new Date('2021-11-03T11:27:00.000Z'),
            new Date('2021-11-03T11:30:00.000Z'),
            new Date('2021-11-03T11:27:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(true);
          });
        });

        it('should return false when the time is out the shift range', () => {
          const times = [
            new Date('2021-10-20T11:26:59.000Z'),
            new Date('2021-10-20T11:30:01.000Z'),
            new Date('2021-11-02T11:26:59.000Z'),
            new Date('2021-11-02T11:30:01.000Z'),
            new Date('2021-11-04T11:26:59.000Z'),
            new Date('2021-11-04T11:30:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(false);
          });
        });
      });

      describe('monthly', () => {
        beforeEach(() => {
          shiftRepeatInput = shiftMonthlyFactory(1, 20)({
            start: new Date('2021-10-20T11:27:00.000Z'),
            end: new Date('2021-10-20T11:30:00.000Z')
          });
        });

        it('should return true when the time is in the shift range', () => {
          const times = [
            new Date('2021-10-20T11:27:00.000Z'),
            new Date('2021-10-20T11:30:00.000Z'),
            new Date('2021-10-20T11:27:01.000Z'),
            new Date('2021-11-20T11:27:00.000Z'),
            new Date('2021-11-20T11:30:00.000Z'),
            new Date('2021-11-20T11:27:01.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(true);
          });
        });

        it('should return false when the time is out the shift range', () => {
          const times = [
            new Date('2021-10-20T11:26:59.000Z'),
            new Date('2021-10-20T11:30:01.000Z'),
            new Date('2021-11-19T11:27:00.000Z'),
            new Date('2021-11-21T11:30:00.000Z')
          ];
          times.forEach((t) => {
            expect(shiftRepeatService.checkDutyWithRepeatRule(shiftRepeatInput.repeat, shiftRepeatInput.start, shiftRepeatInput.end, t, null, []))
              .toEqual(false);
          });
        });
      });
    });
  });

  describe('validateRepeatRule', () => {
    let repeatInput: Repeat;

    describe('daily', () => {
      beforeEach(() => {
        repeatInput = { frequency: RepeatFrequency.DAILY, every: 1 };
      });

      describe('success', () => {
        it('should return none errors', () => {
          expect(shiftRepeatService.validateRepeatRule(repeatInput)).toEqual({ errors: [] });
        });
      });

      describe('error', () => {
        it('should return "every" error', () => {
          const values = [undefined, 0, -1];
          values.forEach((v) => {
            repeatInput.every = v;
            const rs = shiftRepeatService.validateRepeatRule(repeatInput);
            expect(rs.errors[0]).toMatch('Every');
          });
        });
      });
    });

    describe('weekly', () => {
      beforeEach(() => {
        repeatInput = { frequency: RepeatFrequency.WEEKLY, every: 1, weekDay: [WeekDay.MONDAY] };
      });

      describe('success', () => {
        it('should return none errors', () => {
          expect(shiftRepeatService.validateRepeatRule(repeatInput)).toEqual({ errors: [] });
        });
      });

      describe('error', () => {
        it('should return "every" error', () => {
          const values = [undefined, 0, -1];
          values.forEach((v) => {
            repeatInput.every = v;
            const rs = shiftRepeatService.validateRepeatRule(repeatInput);
            expect(rs.errors[0]).toMatch('Every');
          });
        });

        it('should return "Week Day" error', () => {
          const values = [undefined, null];
          values.forEach((v) => {
            repeatInput.weekDay = v;
            const rs = shiftRepeatService.validateRepeatRule(repeatInput);
            expect(rs.errors[0]).toMatch('Week Day');
          });
        });
      });
    });

    describe('montly', () => {
      beforeEach(() => {
        repeatInput = { frequency: RepeatFrequency.MONTHLY, every: 1, each: [1] };
      });

      describe('success', () => {
        it('should return none errors', () => {
          expect(shiftRepeatService.validateRepeatRule(repeatInput)).toEqual({ errors: [] });
        });
      });

      describe('error', () => {
        it('should return "every" error', () => {
          const values = [undefined, 0, -1];
          values.forEach((v) => {
            repeatInput.every = v;
            const rs = shiftRepeatService.validateRepeatRule(repeatInput);
            expect(rs.errors[0]).toMatch('Every');
          });
        });

        it('should return "each" error', () => {
          const values = [0, -1, 32];
          values.forEach((v) => {
            repeatInput.each[0] = v;
            const rs = shiftRepeatService.validateRepeatRule(repeatInput);
            expect(rs.errors[0]).toMatch('Day');
          });
        });
      });
    });
  });

  describe('normalizeRepeatInput', () => {
    let repeatInput: Repeat;

    beforeEach(() => {
      repeatInput = {
        frequency: RepeatFrequency.DAILY,
        every: 1.1,
        weekDay: [WeekDay.FRIDAY],
        each: [1],
        month: [1]
      };
    });

    describe('daily', () => {
      it('should return success input normalized', () => {
        const rs = shiftRepeatService.normalizeRepeatInput(repeatInput);
        expect(rs).toEqual({
          every: 1,
          frequency: RepeatFrequency.DAILY
        });
      });
    });

    describe('weekly', () => {
      it('should return success input normalized', () => {
        repeatInput.frequency = RepeatFrequency.WEEKLY;
        const rs = shiftRepeatService.normalizeRepeatInput(repeatInput);
        expect(rs).toEqual({
          every: 1,
          frequency: RepeatFrequency.WEEKLY,
          weekDay: [WeekDay.FRIDAY]
        });
      });
    });

    describe('monthly', () => {
      it('should return success input normalized', () => {
        repeatInput.frequency = RepeatFrequency.MONTHLY;
        const rs = shiftRepeatService.normalizeRepeatInput(repeatInput);
        expect(rs).toEqual({
          every: 1,
          frequency: RepeatFrequency.MONTHLY,
          each: [1]
        });
      });
    });
  });
});
