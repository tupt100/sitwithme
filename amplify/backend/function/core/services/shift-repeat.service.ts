import { PlatformException } from "@swm-core/exceptions/platform.exception";
import { EventRange, Repeat, RepeatFrequency, RepeatOn, WeekDay } from "@swm-core/interfaces/repeat.interface";
import { EventRangeInDate, EventRangesInDate, EventRangesInDateV2 } from "@swm-core/interfaces/shift.interface";
import { dateInTz, dateInUTC, endOfDate, getNearestDateInDayCycle, getNearestDateInMonthCycle, getNearestDateInWeekCycle, getNearestDateInYearCycle, startOfDate } from "@swm-core/utils/date.util";

export class ShiftRepeatService {

  /**
   * List all shift events happen in this date
   *
   * 1. Find the nearest anchor date, base on repeat rule
   * 2. Generate the event range
   */
  listShiftEventsByDate(repeat: Repeat, start: Date, end: Date, time: Date, endRepeat: Date, excepts: Date[] = []): EventRange {
    if (!repeat) {
      if (time.getTime() > end.getTime()) {
        return;
      }

      const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(start).getTime());
      if (eventExcept) {
        return;
      }

      return { start, end };
    }

    try {
      let date: Date;
      const frequency: RepeatFrequency = repeat.frequency;
      const _endRepeat = endRepeat ? endOfDate(endRepeat) : null;
      switch (frequency) {
        case RepeatFrequency.DAILY:
          date = getNearestDateInDayCycle(start, time, repeat.every)?.date;
          break;
        case RepeatFrequency.WEEKLY:
          date = getNearestDateInWeekCycle(start, time, repeat.every, repeat.weekDay)?.date;
          break;
        case RepeatFrequency.MONTHLY:
          date = getNearestDateInMonthCycle(start, time, repeat.every, repeat.each, repeat.onThe)?.date;
          break;
        case RepeatFrequency.YEARLY:
          date = getNearestDateInYearCycle(start, time, repeat.every, repeat.month, repeat.onThe)?.date;
          break;
        default:
          throw new PlatformException(`This frequency ${frequency} does not support.`);
      }

      if (!date ||
          (_endRepeat && date.getTime() > _endRepeat.getTime())
         ) {
        return;
      }

      const event = this.generateShiftEvent(start, end, date);
      if (event) {
        const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(event.start).getTime());
        if (eventExcept) {
          return;
        }
      }

      return event;
    } catch (e) {
      console.log('ERROR: ', e);
      console.log('DETAIL: ', JSON.stringify(repeat, null, 2));
    }
  }

  /**
   * Get the next event range base on repeat rule and <step> relative number
   *
   * @param {Repeat} repeat: the shift repeat rule
   * @param {Date} start: the shift start date
   * @param {Date} end: the shift end date
   * @param {Date} time: the current anchor time
   * @param {Date} endRepeat: the shift end repeat time
   * @param {number} step: the step number, positive value is the future, otherwise it's past
   * @param {Array<Date>} excepts: the shift excepts date
   *
   * @returns {EventRange} the next event range
   */
  getNextEvent(repeat: Repeat, start: Date, end: Date, time: Date, endRepeat: Date, step: number = 1, excepts: Date[] = []): EventRange {
    if (!repeat) {
      if (step > 0 && time.getTime() > start.getTime()) {
        return;
      }

      const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(start).getTime());
      if (eventExcept) {
        return;
      }

      return { start, end };
    }

    try {
      let date: Date;
      const frequency: RepeatFrequency = repeat.frequency;
      const _endRepeat = endRepeat ? endOfDate(endRepeat) : null;
      switch (frequency) {
        case RepeatFrequency.DAILY:
          date = this.getNextStartDateInDayCycle(start, time, step, repeat.every);
          break;
        case RepeatFrequency.WEEKLY:
          date = this.getNextStartDateInWeekCycle(start, time, step, repeat.every, repeat.weekDay);
          break;
        case RepeatFrequency.MONTHLY:
          date = this.getNextStartDateInMonthCycle(start, time, step, repeat.every, repeat.each, repeat.onThe);
          break;
        default:
          throw new PlatformException(`This frequency ${frequency} does not support.`);
      }

      if (!date ||
          (_endRepeat && date.getTime() > _endRepeat.getTime())
         ) {
        return;
      }

      let event = this.generateShiftEvent(start, end, date);
      if (event) {
        const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(event.start).getTime());
        if (eventExcept) {
          event = this.getNextEvent(repeat, start, end, event.start, endRepeat, step, excepts);
        }
      }

      return event;
    } catch (e) {
      console.log('ERROR: ', e);
      console.log('DETAIL: ', JSON.stringify(repeat, null, 2));
    }
  }

  /**
   * Get the next shift start date in the next <step> cycle.
   * We find the nearest start date in the current cycle, then
   * plus <step> cycle
   *
   * Special case: If the time is lower than the shift start date,
   * then anchor should be the date before the shift start date 1 day
   *
   * @param {Date} start: Shift start date
   * @param {Date} time: The current time to anchor
   * @param {number} step: The step number, positive value is the future, otherwise it's past
   * @param {number} every: The cycle duration of this shift repeat
   *
   * @returns {Date} the next shift start date calculated from the <step> number
   */
  getNextStartDateInDayCycle(start: Date, time: Date, step: number, every: number): Date {
    // Special case: If the time is lower than the shift start date,
    // then anchor should be the date before the shift start date 1 day
    if (time.getTime() < start.getTime()) {
      const d = new Date(start.getTime());
      d.setDate(d.getDate() - 1 + every*step);
      return d;
    }

    // normal case
    const anchorDate = getNearestDateInDayCycle(start, time, every);
    if (anchorDate) {
      const date = anchorDate.date;
      date.setDate(date.getDate() + every*step);
      return date;
    }
  }

  /**
   * Get the next shift start date in the next <step> cycle.
   * We find the nearest start date in the current cycle, then
   * plus <step> cycle
   *
   * Special case: If the time is lower than the shift start date,
   * then anchor should be the date before the shift start date 1 week
   *
   * @param {Date} start: Shift start date
   * @param {Date} time: The current time to anchor
   * @param {number} step: The step number, positive value is the future, otherwise it's past
   * @param {number} every: The cycle duration of this shift repeat
   * @param {Array<WeekDay>} weekDays: The week day for repeat rule
   *
   * @returns {Date} the next shift start date calculated from the <step> number
   */
  getNextStartDateInWeekCycle(start: Date, time: Date, step: number, every: number, weekDays: WeekDay[]): Date {
    // Special case: If the time is lower than the shift start date,
    // then anchor should be the date before the shift start date 1 day
    if (time.getTime() < start.getTime()) {
      const d = new Date(start.getTime());
      d.setDate(d.getDate() - 7 + (7*every*step));
      return d;
    }

    // normal case
    const anchorDate = getNearestDateInWeekCycle(start, time, every, weekDays);
    if (anchorDate) {
      const date = anchorDate.date;
      date.setDate(date.getDate() + (7*every*step));
      return date;
    }
  }

  /**
   * Get the next shift start date in the next <step> cycle.
   * We find the nearest start date in the current cycle, then
   * plus <step> cycle
   *
   * Special case: If the time is lower than the shift start date,
   * then anchor should be the date before the shift start date 1 month
   *
   * @param {Date} start: Shift start date
   * @param {Date} time: The current time to anchor
   * @param {number} step: The step number, positive value is the future, otherwise it's past
   * @param {number} every: The cycle duration of this shift repeat
   * @param {Array<number>} each: the date in month
   *
   * @returns {Date} the next shift start date calculated from the <step> number
   */
  getNextStartDateInMonthCycle(start: Date, time: Date, step: number, every: number, each: number[], onThe: RepeatOn): Date {
    // Special case: If the time is lower than the shift start date,
    // then anchor should be the date before the shift start date 1 month
    if (time.getTime() < start.getTime()) {
      const d = new Date(start.getTime());
      d.setMonth(d.getMonth() - 1 + every*step);
      return d;
    }

    // normal case
    const anchorDate = getNearestDateInMonthCycle(start, time, every, each, onThe);
    if (anchorDate) {
      const date = anchorDate.date;
      date.setMonth(date.getMonth() + every*step);
      return date;
    }
  }

  listShiftEventsWithRepeatRuleV2(repeat: Repeat, start: Date, end: Date, rangeStart: Date, rangeEnd: Date, tz: number, endRepeat: Date, excepts: Date[] = []): EventRangesInDateV2[] {
    // normalize input
    const _rangeStart = startOfDate(rangeStart); // local time
    const _rangeEnd = endOfDate(rangeEnd);

    const _start = dateInTz(start, tz); // convert to local time
    const _end = dateInTz(end, tz);

    if (!repeat) {
      return this.listShiftEventsWithNeverRepeatV2(_start, _end, _rangeStart, _rangeEnd, excepts);
    }

    try {
      let rs = [];
      const frequency: RepeatFrequency = repeat.frequency;
      const _endRepeat = endRepeat ? endOfDate(endRepeat) : null;
      switch (frequency) {
        case RepeatFrequency.DAILY:
          rs = this.listShiftEventsWithEveryDayRepeatV2(_start, _end, _rangeStart, _rangeEnd, repeat.every, _endRepeat, excepts, tz);
          break;
        case RepeatFrequency.WEEKLY:
          rs = this.listShiftEventsWithEveryWeekRepeatV2(_start, _end, _rangeStart, _rangeEnd, repeat.every, repeat.weekDay, _endRepeat, excepts, tz);
          break;
        case RepeatFrequency.MONTHLY:
          rs = this.listShiftEventsWithEveryMonthRepeatV2(_start, _end, _rangeStart, _rangeEnd, repeat.every, repeat.each, repeat.onThe, _endRepeat, excepts, tz);
          break;
        default:
          throw new PlatformException(`This frequency ${frequency} does not support.`);
      }
      return rs;
    } catch (e) {
      console.log('ERROR: ', e);
      console.log('DETAIL: ', JSON.stringify(repeat, null, 2));
      return [];
    }
  }

  /**
   * input:
   *   start: '2021-07-10 16:00'
   *   end: '2021-07-12 17:00'
   *   rangeStart: '2021-07-01'
   *   rangeEnd: '2021-07-31'
   * return:
   *   [{
   *     date: '2021-07-10',
   *     startDate: '2021-07-10'
   *     range: [{
   *        start: '2021-07-10 16:00',
   *        end: '2021-07-10 23:59'
   *     }]
   *   },
   *   {
   *     date: '2021-07-11',
   *     range: [{
   *        start: '2021-07-11 00:00',
   *        end: '2021-07-11 23:59'
   *     }]
   *   },
   *   {
   *     date: '2021-07-12',
   *     range: [{
   *        start: '2021-07-12 00:00',
   *        end: '2021-07-12 17:00'
   *     }]
   *   }]
   */
  listShiftEventsWithNeverRepeatV2(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, excepts: Date[]): EventRangesInDateV2[] {
    const startSOD = startOfDate(start);
    const endTime = rangeEnd.getTime();

    const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(start).getTime());
    if (eventExcept) {
      return [];
    }

    if (rangeStart.getTime() <= startSOD.getTime() && startSOD.getTime() <= endTime) {
      return [{
        startDate: start,
        endDate: end,
        range: [{
          start: start,
          end: end
        }]
      }];
    }

    return [];
  }

  listShiftEventsWithEveryDayRepeatV2(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, every: number, endRepeat: Date, excepts: Date[], tz: number): EventRangesInDateV2[] {
    return this.listShiftEventsWithAnyRepeatV2(start, end, rangeStart, rangeEnd, endRepeat, excepts, tz, getNearestDateInDayCycle, [every]);
  }

  listShiftEventsWithEveryWeekRepeatV2(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, every: number, weekDays: WeekDay[], endRepeat: Date, excepts: Date[], tz: number): EventRangesInDateV2[] {
    return this.listShiftEventsWithAnyRepeatV2(start, end, rangeStart, rangeEnd, endRepeat, excepts, tz, getNearestDateInWeekCycle, [every, weekDays]);
  }

  listShiftEventsWithEveryMonthRepeatV2(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, every: number, each: number[], onThe: RepeatOn, endRepeat: Date, excepts: Date[], tz: number): EventRangesInDateV2[] {
    return this.listShiftEventsWithAnyRepeatV2(start, end, rangeStart, rangeEnd, endRepeat, excepts, tz, getNearestDateInMonthCycle, [every, each, onThe]);
  }

  listShiftEventsWithAnyRepeatV2(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, endRepeat: Date, excepts: Date[], tz: number, getNearestDateInCycleCallback: any, ...repeatOpt: object[]): EventRangesInDateV2[] {
    // 1. Loop time from rangeStart to rangeEnd, each:
    // 2. Find the nearest date in cycle of the time
    // 3. Generate the shift event base on the nearest date

    const rs = [];
    const startSOD = startOfDate(start);
    let endTime = rangeEnd.getTime();
    const anchorCycleDate = [];

    // 1. Loop time from rangeStart to rangeEnd
    for (let d = new Date(rangeStart.getTime()); d.getTime() <= endTime; d.setDate(d.getDate() + 1)) {
      if (d.getTime() < startSOD.getTime()) {
        continue;
      }

      // 2. Find the nearest date in cycle of the time
      const opt: any = ([startSOD, d] as any[]).concat(...repeatOpt);
      const {date: nearestDateInCycle, cycle} = getNearestDateInCycleCallback.apply(this, opt);

      if (!nearestDateInCycle) {
        continue;
      }

      nearestDateInCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());

      // skip if we already process the anchor of cycle date
      const prevAnchor = anchorCycleDate.find((e) => e === nearestDateInCycle.getTime());
      if (!prevAnchor) {
        anchorCycleDate.push(nearestDateInCycle.getTime());

        // 3. Generate the shift event base on the nearest date
        const event = this.generateShiftEvent(start, end, nearestDateInCycle);
        if (event) {
          if (endRepeat && event.start.getTime() > endRepeat.getTime()) {
            return rs;
          }

          const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(dateInUTC(event.start, tz)).getTime());
          if (eventExcept) {
            continue;
          }

          const eventStartTime = startOfDate(event.start);

          if (eventStartTime.getTime() > endTime) {
            return rs;
          }

          if (eventStartTime.getTime() >= rangeStart.getTime()) {
            rs.push({
              startDate: event.start,
              endDate: event.end,
              range: [{
                start: event.start,
                end: event.end
              }]
            });
          }
        }
      }
    }

    return rs;
  }

  listShiftEventsWithRepeatRule(repeat: Repeat, start: Date, end: Date, rangeStart: Date, rangeEnd: Date, endRepeat: Date, excepts: Date[] = []): EventRangesInDate[] {
    // normalize input
    const _rangeStart = new Date(rangeStart.getTime());
    _rangeStart.setHours(0, 0, 0, 0);
    const _rangeEnd = new Date(rangeEnd.getTime());
    _rangeEnd.setHours(23, 59, 59, 999);

    if (!repeat) {
      return this.listShiftEventsWithNeverRepeat(start, end, _rangeStart, _rangeEnd, excepts);
    }

    try {
      let rs = [];
      const frequency: RepeatFrequency = repeat.frequency;
      const _endRepeat = endRepeat ? endOfDate(endRepeat) : null;
      switch (frequency) {
        case RepeatFrequency.DAILY:
          rs = this.listShiftEventsWithEveryDayRepeat(start, end, _rangeStart, _rangeEnd, repeat.every, _endRepeat, excepts);
          break;
        case RepeatFrequency.WEEKLY:
          rs = this.listShiftEventsWithEveryWeekRepeat(start, end, _rangeStart, _rangeEnd, repeat.every, repeat.weekDay, _endRepeat, excepts);
          break;
        case RepeatFrequency.MONTHLY:
          rs = this.listShiftEventsWithEveryMonthRepeat(start, end, _rangeStart, _rangeEnd, repeat.every, repeat.each, repeat.onThe, _endRepeat, excepts);
          break;
        case RepeatFrequency.YEARLY:
          rs = this.listShiftEventsWithEveryYearRepeat(start, end, _rangeStart, _rangeEnd, repeat.every, repeat.month, repeat.onThe, _endRepeat, excepts);
          break;
        default:
          throw new PlatformException(`This frequency ${frequency} does not support.`);
      }
      return rs;
    } catch (e) {
      console.log('ERROR: ', e);
      console.log('DETAIL: ', JSON.stringify(repeat, null, 2));
      return [];
    }
  }

  /**
   * input:
   *   start: '2021-07-10 16:00'
   *   end: '2021-07-12 17:00'
   *   rangeStart: '2021-07-01'
   *   rangeEnd: '2021-07-31'
   * return:
   *   [{
   *     date: '2021-07-10',
   *     range: [{
   *        start: '2021-07-10 16:00',
   *        end: '2021-07-10 23:59'
   *     }]
   *   },
   *   {
   *     date: '2021-07-11',
   *     range: [{
   *        start: '2021-07-11 00:00',
   *        end: '2021-07-11 23:59'
   *     }]
   *   },
   *   {
   *     date: '2021-07-12',
   *     range: [{
   *        start: '2021-07-12 00:00',
   *        end: '2021-07-12 17:00'
   *     }]
   *   }]
   */
  listShiftEventsWithNeverRepeat(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, excepts: Date[]): EventRangesInDate[] {
    const rs = [];
    const startSOD = startOfDate(start);
    const endTime = rangeEnd.getTime();

    const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(start).getTime());
    if (eventExcept) {
      return rs;
    }

    for (let d = new Date(rangeStart.getTime()); d.getTime() <= endTime; d.setDate(d.getDate() + 1)) {
      const time = d.getTime();
      if (time >= startSOD.getTime() && time <= end.getTime()) {
        const event = this.generateEventRangeInDate(start, end, d);
        rs.push({
          date: event.date,
          range: [{
            start,
            end,
            startInDate: event.rangeInDate.start,
            endInDate: event.rangeInDate.end,
            cycle: 0
          }]
        });
      }
    }

    return rs;
  }

  /**
   * input:
   *   start: '2021-07-10 16:00'
   *   end: '2021-07-12 17:00'
   *   every: 2
   *   rangeStart: '2021-07-01'
   *   rangeEnd: '2021-07-31'
   * return:
   *   [{
   *     date: '2021-07-10',
   *     range: [{
   *        start: '2021-07-10 16:00',
   *        end: '2021-07-10 23:59'
   *     }]
   *   },
   *   {
   *     date: '2021-07-11',
   *     range: [{
   *        start: '2021-07-11 00:00',
   *        end: '2021-07-11 23:59'
   *     }]
   *   },
   *   {
   *     date: '2021-07-12',
   *     range: [
   *     {
   *        start: '2021-07-12 00:00',
   *        end: '2021-07-12 17:00'
   *     },
   *     {
   *        start: '2021-07-12 16:00',
   *        end: '2021-07-12 23:59'
   *     }]
   *   },
   *   ...]
   */
  listShiftEventsWithEveryDayRepeat(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, every: number, endRepeat: Date, excepts: Date[]): EventRangesInDate[] {
    return this.listShiftEventsWithAnyRepeat(start, end, rangeStart, rangeEnd, endRepeat, excepts, getNearestDateInDayCycle, [every]);
  }

  listShiftEventsWithEveryWeekRepeat(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, every: number, weekDays: WeekDay[], endRepeat: Date, excepts: Date[]): EventRangesInDate[] {
    return this.listShiftEventsWithAnyRepeat(start, end, rangeStart, rangeEnd, endRepeat, excepts, getNearestDateInWeekCycle, [every, weekDays]);
  }

  listShiftEventsWithEveryMonthRepeat(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, every: number, each: number[], onThe: RepeatOn, endRepeat: Date, excepts: Date[]): EventRangesInDate[] {
    return this.listShiftEventsWithAnyRepeat(start, end, rangeStart, rangeEnd, endRepeat, excepts, getNearestDateInMonthCycle, [every, each, onThe]);
  }

  listShiftEventsWithEveryYearRepeat(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, every: number, months: number[], onThe: RepeatOn, endRepeat: Date, excepts: Date[]): EventRangesInDate[] {
    const _months = months.map(m => m - 1); // _months range from 0..11
    return this.listShiftEventsWithAnyRepeat(start, end, rangeStart, rangeEnd, endRepeat, excepts, getNearestDateInYearCycle, [every, _months, onThe]);
  }

  listShiftEventsWithAnyRepeat(start: Date, end: Date, rangeStart: Date, rangeEnd: Date, endRepeat: Date, excepts: Date[], getNearestDateInCycleCallback: any, ...repeatOpt: object[]): EventRangesInDate[] {
    // 1. Loop time from rangeStart to rangeEnd, each:
    // 2. Find the nearest date in cycle of the time
    // 3. Generate the shift event base on the nearest date
    // 4. Loop all shift event and generate event range

    // if (rangeStart.getTime() > end.getTime() || rangeEnd.getTime() < start.getTime()) {
    //   return [];
    // }

    const rs = [];
    const startSOD = startOfDate(start);
    let endTime = rangeEnd.getTime();
    const anchorCycleDate = [];

    // 1. Loop time from rangeStart to rangeEnd
    for (let d = new Date(rangeStart.getTime()); d.getTime() <= endTime; d.setDate(d.getDate() + 1)) {
      if (d.getTime() < startSOD.getTime()) {
        continue;
      }

      // 2. Find the nearest date in cycle of the time
      const opt: any = ([startSOD, d] as any[]).concat(...repeatOpt);
      const {date: nearestDateInCycle, cycle} = getNearestDateInCycleCallback.apply(this, opt);

      if (!nearestDateInCycle) {
        continue;
      }

      nearestDateInCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());

      // skip if we already process the anchor of cycle date
      const prevAnchor = anchorCycleDate.find((e) => e === nearestDateInCycle.getTime());
      if (!prevAnchor) {
        anchorCycleDate.push(nearestDateInCycle.getTime());

        // 3. Generate the shift event base on the nearest date
        const event = this.generateShiftEvent(start, end, nearestDateInCycle);
        if (event) {
          if (endRepeat && event.start.getTime() > endRepeat.getTime()) {
            return rs;
          }

          const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(event.start).getTime());
          if (eventExcept) {
            continue;
          }

          const eventEndTime = event.end.getTime();
          const eventStartTime = startOfDate(event.start);

          // 4. Loop all shift event and generate event range
          while (eventStartTime.getTime() <= eventEndTime) {
            if (eventStartTime.getTime() > endTime) {
              return rs;
            }

            if (eventStartTime.getTime() >= rangeStart.getTime()) {
              let item = rs.find(_d => _d.date.getTime() === eventStartTime.getTime());
              if (!item) {
                item = { date: new Date(eventStartTime.getTime()), range: [] };
                rs.push(item);
              }

              const rangeInDate = this.generateEventRangeInDate(event.start, event.end, eventStartTime).rangeInDate;
              item.range.push({
                cycle,
                startInDate: rangeInDate.start,
                endInDate: rangeInDate.end,
                start: event.start,
                end: event.end
              });

            }

            eventStartTime.setDate(eventStartTime.getDate() + 1);
          }
        }
      }
    }

    return rs;
  }

  checkDutyWithRepeatRule(repeat: Repeat, start: Date, end: Date, time: Date, endRepeat: Date, excepts: Date[] = []) {
    if (!repeat) {
      return this.checkDutyWithNeverRepeat(start, end, time, excepts);
    }

    try {
      let rs = false;
      const frequency: RepeatFrequency = repeat.frequency;
      const _endRepeat = endRepeat ? endOfDate(endRepeat) : null;
      switch (frequency) {
        case RepeatFrequency.DAILY:
          rs = this.checkDutyWithEveryDayRepeat(start, end, time, repeat.every, _endRepeat, excepts);
          break;
        case RepeatFrequency.WEEKLY:
          rs = this.checkDutyWithEveryWeekRepeat(start, end, time, repeat.every, repeat.weekDay, _endRepeat, excepts);
          break;
        case RepeatFrequency.MONTHLY:
          rs = this.checkDutyWithEveryMonthRepeat(start, end, time, repeat.every, repeat.each, repeat.onThe, _endRepeat, excepts);
          break;
        case RepeatFrequency.YEARLY:
          rs = this.checkDutyWithEveryYearRepeat(start, end, time, repeat.every, repeat.month, repeat.onThe, _endRepeat, excepts);
          break;
        default:
          throw new PlatformException(`This frequency ${frequency} does not support.`);
      }
      return rs;
    } catch (e) {
      console.log('ERROR: ', e);
      console.log('DETAIL: ', JSON.stringify(repeat, null, 2));
      return false;
    }
  }

  checkDutyWithNeverRepeat(start: Date, end: Date, time: Date, excepts: Date[]): boolean {
    const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(start).getTime());
    if (eventExcept) {
      return false;
    }

    const _time = time.getTime();
    return (_time >= start.getTime() && _time <= end.getTime());
  }

  checkDutyWithEveryDayRepeat(start: Date, end: Date, time: Date, every: number, endRepeat: Date, excepts: Date[]): boolean {
    return this.checkDutyWithAnyRepeat(start, end, time, endRepeat, excepts, getNearestDateInDayCycle, [every]);
  }

  checkDutyWithEveryWeekRepeat(start: Date, end: Date, time: Date, every: number, weekDays: WeekDay[], endRepeat: Date, excepts: Date[]): boolean {
    return this.checkDutyWithAnyRepeat(start, end, time, endRepeat, excepts, getNearestDateInWeekCycle, [every, weekDays]);
  }

  checkDutyWithEveryMonthRepeat(start: Date, end: Date, time: Date, every: number, each: number[], onThe: RepeatOn, endRepeat: Date, excepts: Date[]): boolean {
    return this.checkDutyWithAnyRepeat(start, end, time, endRepeat, excepts, getNearestDateInMonthCycle, [every, each, onThe]);
  }

  // months range from 1..12
  checkDutyWithEveryYearRepeat(start: Date, end: Date, time: Date, every: number, months: number[], onThe: RepeatOn, endRepeat: Date, excepts: Date[]): boolean {
    const _months = months.map(m => m - 1); // _months range from 0..11
    return this.checkDutyWithAnyRepeat(start, end, time, endRepeat, excepts, getNearestDateInYearCycle, [every, _months, onThe]);
  }

  checkDutyWithAnyRepeat(start: Date, end: Date, time: Date, endRepeat: Date, excepts: Date[], getNearestDateInCycleCallback: any, ...repeatOpt: object[]): boolean {
    if (time.getTime() < start.getTime()) {
      return false;
    }

    const opt = ([start, time] as any[]).concat(...repeatOpt);
    const {date: nearestDateInCycle, cycle} = getNearestDateInCycleCallback.apply(this, opt);
    if (!nearestDateInCycle || (endRepeat && nearestDateInCycle.getTime() > endRepeat.getTime())) {
      return false;
    }

    const event = this.generateShiftEvent(start, end, nearestDateInCycle);
    if (event) {
      // remove except events
      const eventExcept = excepts.find((eventDeleted) => eventDeleted.getTime() === startOfDate(event.start).getTime());
      if (eventExcept) {
        return false;
      }

      const _time = time.getTime();
      return (_time >= event.start.getTime() && _time <= event.end.getTime());
    }
    return false;
  }

  generateShiftEvent(start: Date, end: Date, time: Date): EventRange {
    const newStart = new Date(time.getTime());
    newStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());

    if (newStart.getTime() < start.getTime()) {
      return;
    }

    const deltaTime = end.getTime() - start.getTime();
    const newEnd = new Date(newStart.getTime() + deltaTime);

    return { start: newStart, end: newEnd };
  }

  /**
   * Generate event range group by date. Example:
   *   start: '2021-07-10 16:00'
   *   end: '2021-07-12 17:00'
   *   date: '2021-07-11'
   * return:
   *   {
   *     date: '2021-07-11',
   *     rangeInDate: {
   *        start: '2021-07-11 00:00',
   *        end: '2021-07-11 23:59'
   *     }
   *   }
   */
  generateEventRangeInDate(start: Date, end: Date, time: Date): EventRangeInDate {
    const startDay = new Date(time.getTime());
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(time.getTime());
    endDay.setHours(23, 59, 59, 999);

    return {
      date: startDay,
      rangeInDate: {
        start: new Date(Math.max(start.getTime(), startDay.getTime())),
        end: new Date(Math.min(end.getTime(), endDay.getTime()))
      }
    };
  }

  validateRepeatRule(repeat: Repeat): { [key: string]: any } {
    switch (repeat.frequency) {
      case RepeatFrequency.DAILY:
        return this.validateDailyRepeat(repeat);

      case RepeatFrequency.WEEKLY:
        return this.validateWeeklyRepeat(repeat);

      case RepeatFrequency.MONTHLY:
        return this.validateMonthlyRepeat(repeat);

      case RepeatFrequency.YEARLY:
        return this.validateYearlyRepeat(repeat);

      default:
        return {};
    }
  }

  validateDailyRepeat(repeat: Repeat): { [key: string]: any } {
    const rs = { errors: [] };
    if (typeof(repeat.every) === 'undefined' || repeat.every === null) {
      rs.errors.push('Every is required');
    } else {
      const min = 1;
      if (repeat.every < min) {
        rs.errors.push(`Every is equal or greater than ${min}`);
      }
    }
    return rs;
  }

  validateWeeklyRepeat(repeat: Repeat): { [key: string]: any } {
    const rs = { errors: [] };
    if (typeof(repeat.every) === 'undefined' || repeat.every === null) {
      rs.errors.push('Every is required');
    } else {
      const min = 1;
      if (repeat.every < min) {
        rs.errors.push(`Every is equal or greater than ${min}`);
      }
    }

    if (!repeat.weekDay) {
      rs.errors.push('Week Day is required');
    }
    return rs;
  }

  validateMonthlyRepeat(repeat: Repeat): { [key: string]: any } {
    const rs = { errors: [] };
    if (typeof(repeat.every) === 'undefined' || repeat.every === null) {
      rs.errors.push('Every is required');
    } else {
      const min = 1;
      if (repeat.every < min) {
        rs.errors.push(`Every is equal or greater than ${min}`);
      }
    }

    if (repeat.each?.length && repeat.onThe) {
      rs.errors.push(`Either Each or OnThe can be filled`);
    } else if (!repeat.each?.length && !repeat.onThe) {
      rs.errors.push(`Either Each or OnThe is required`);
    } else {
      if (repeat.each?.length) {
        const min = 1;
        const max = 31;
        for (const day of repeat.each) {
          if (day < min || day > max) {
            rs.errors.push(`Day must be between ${min} and ${max}`);
            break;
          }
        }
      } else if (repeat.onThe) {
        rs.errors = rs.errors.concat(this.validateDaysOfWeek(repeat.onThe).errors);
      }
    }
    return rs;
  }

  validateYearlyRepeat(repeat: Repeat): { [key: string]: any } {
    const rs = { errors: [] };
    if (typeof(repeat.every) === 'undefined' || repeat.every === null) {
      rs.errors.push('Every is required');
    } else {
      const min = 1;
      if (repeat.every < min) {
        rs.errors.push(`Every is equal or greater than ${min}`);
      }
    }

    if (repeat.month?.length) {
      const min = 1;
      const max = 12;
      for (const month of repeat.month) {
        if (month < min || month > max) {
          rs.errors.push(`Month must be between ${min} and ${max}`);
          break;
        }
      }

      if (repeat.onThe) {
        rs.errors = rs.errors.concat(this.validateDaysOfWeek(repeat.onThe).errors);
      }
    } else {
      rs.errors.push('Month is required');
    }

    return rs;
  }

  validateDaysOfWeek(onThe: RepeatOn): { [key: string]: any } {
    const rs = { errors: [] };
    if (typeof(onThe.sequence) === 'undefined' && onThe.sequence === null) {
      rs.errors.push(`Sequence is required`);
    } else {
      const min = 1;
      const max = 6;
      if (onThe.sequence < min || onThe.sequence > max) {
        rs.errors.push(`Sequence must be between ${min} and ${max}`);
      }
    }

    if (!onThe.weekDay) {
      rs.errors.push(`Week Day is required`);
    }
    return rs;
  }

  normalizeRepeatInput(repeat: Repeat): Repeat {
    switch (repeat.frequency) {
      case RepeatFrequency.DAILY:
        repeat = this.normalizeDailyRepeat(repeat);
        break;

      case RepeatFrequency.WEEKLY:
        repeat = this.normalizeWeeklyRepeat(repeat);
        break;

      case RepeatFrequency.MONTHLY:
        repeat = this.normalizeMonthlyRepeat(repeat);
        break;

      case RepeatFrequency.YEARLY:
        repeat = this.normalizeYearlyRepeat(repeat);
        break;

      default:
        break;
    }
    return repeat;
  }

  normalizeDailyRepeat(repeat: Repeat): Repeat {
    repeat.every = Math.floor(repeat.every);

    // clean up since daily repeat doesn't need them
    delete repeat.weekDay;
    delete repeat.each;
    delete repeat.onThe;
    delete repeat.month;

    return repeat;
  }

  normalizeWeeklyRepeat(repeat: Repeat): Repeat {
    repeat.every = Math.floor(repeat.every);

    // clean up since weekly repeat doesn't need them
    delete repeat.each;
    delete repeat.onThe;
    delete repeat.month;

    return repeat;
  }

  normalizeMonthlyRepeat(repeat: Repeat): Repeat {
    repeat.every = Math.floor(repeat.every);
    if (repeat.each?.length) {
      repeat.each = repeat.each.map((e) => Math.floor(e));
      delete repeat.onThe;
    } else if (repeat.onThe) {
      repeat.onThe.sequence = Math.floor(repeat.onThe.sequence);
      delete repeat.each;
    }

    // clean up since monthly repeat doesn't need them
    delete repeat.month;
    delete repeat.weekDay;

    return repeat;
  }

  normalizeYearlyRepeat(repeat: Repeat): Repeat {
    repeat.every = Math.floor(repeat.every);
    if (repeat.month?.length) {
      repeat.month = repeat.month.map((e) => Math.floor(e));
    }
    if (repeat.onThe) {
      repeat.onThe.sequence = Math.floor(repeat.onThe.sequence);
    }

    // clean up since yearly repeat doesn't need them
    delete repeat.weekDay;
    delete repeat.each;

    return repeat;
  }
}
