import { RepeatOn, WeekDay } from "@swm-core/interfaces/repeat.interface";

export enum WeekDayValue {
  SUNDAY = 0,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY
}

export interface AnchorCycleDate {
  date: Date;
  cycle: number;
}

export const ONE_DAY = 86400000;
export const ONE_WEEK = 86400000*7;

export const toWeekDay = (value: number): WeekDay => {
  const mapping = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return mapping[value] as WeekDay;
};

export const toReadbleString = (date: Date): string => {
  const options: any = { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  return date.toLocaleString('en-US', options);
};

export const toDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const monthDiff = (from: Date, to: Date): number => {
  return to.getMonth() - from.getMonth() +
    (12 * (to.getFullYear() - from.getFullYear()))
};

export const startOfDate = (date: Date): Date => {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDate = (date: Date): Date => {
  const d = new Date(date.getTime());
  d.setHours(23, 59, 59, 999);
  return d;
};

export const dateInTz = (date: Date, tz: number): Date => {
  const d = new Date(date.getTime());
  d.setTime(d.getTime() + tz*60*1000);
  return d;
};

export const dateInUTC = (date: Date, tz: number): Date => dateInTz(date, -tz);

export const getTzISOString = (date: Date, tz: number): string => {
  const isoString = new Date(date.getTime()).toISOString();
  return `${isoString.slice(0, -1)}${tz > 0 ? '+' : '-'}${String(Math.floor(Math.abs(tz) / 60)).padStart(2, '0')}:${String(Math.abs(tz) % 60).padStart(2, '0')}`;
};

export const nextDateByWeekDay = (date: Date, weekDay: WeekDay): Date => {
  const d = new Date(date.getTime());
  const weekDayValue = WeekDayValue[weekDay];
  while (d.getDay() !== weekDayValue) {
    d.setDate(d.getDate() + 1);
  }

  return d;
};

export const nextDatesByWeekDays = (date: Date, weekDays: WeekDay[]): Date[] => {
  return weekDays.map((weekDay) => nextDateByWeekDay(date, weekDay));
};

export const getMonday = (date: Date) => {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

export const firstDayOfMonth = (date: Date) => {
  const d = new Date(date.getTime());
  d.setDate(1);
  return d;
};

export const listDatesInWeekByWeekDays = (date: Date, weekDays: WeekDay[]): Date[] => {
  const monday = getMonday(date);
  return nextDatesByWeekDays(monday, weekDays);
};

export const listDatesInMonthByDays = (date: Date, days: number[]): Date[] => {
  const month = date.getMonth();
  return days.map((_d) => {
    const d = new Date(date.getTime());
    d.setMonth(month);
    d.setDate(_d);
    if (d.getMonth() !== month) {
      return null;
    }
    return d;
  }).filter((_d) => _d);
};

export const listDatesInMonthByWeekDayRule = (date: Date, onThe: RepeatOn): Date[] => {
  const d = firstDayOfMonth(date);
  const month = d.getMonth();
  const weekDayCount = [0, 0, 0, 0, 0, 0, 0];
  const dates = [];
  const sequence = onThe.sequence === 6 ? weekCountByWeekDay(d.getFullYear(), month, WeekDayValue[onThe.weekDay]) : onThe.sequence;

  // repeat until end of month
  while (d.getMonth() === month) {
    const weekDay = d.getDay(); // from 0-6, from sun-sat
    if (weekDay === WeekDayValue[onThe.weekDay]) {
      weekDayCount[weekDay] += 1;
    }

    if (weekDayCount[weekDay] === sequence) {
      dates.push(new Date(d.getTime()));
    }

    d.setDate(d.getDate() + 1);
  }

  return dates;
};

// months range: from 0..11
export const listDatesInYearByMonths = (date: Date, months: number[], onThe: RepeatOn): Date[] => {
  const dates = [];
  let anchorDate = date.getDate();
  for (const month of months) {
    let d: Date;
    if (onThe) {
      const weekDayCount = [0, 0, 0, 0, 0, 0, 0];
      d = firstDayOfMonth(date);
      d.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
      const sequence = onThe.sequence === 6 ? weekCountByWeekDay(d.getFullYear(), month, WeekDayValue[onThe.weekDay]) : onThe.sequence;

      // repeat until end of month
      while (d.getMonth() === month) {
        const weekDay = d.getDay(); // from 0-6, from sun-sat
        if (weekDay === WeekDayValue[onThe.weekDay]) {
          weekDayCount[weekDay] += 1;
        }

        if (weekDayCount[weekDay] === sequence) {
          dates.push(new Date(d.getTime()));
        }

        d.setDate(d.getDate() + 1);
      }
    } else {
      d = new Date(date.getFullYear(), month, anchorDate);
      d.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());

      if (d.getMonth() === month) {
        dates.push(d);
      }
    }
  }
  return dates;
};

// month is in the range 0..11
// monday is first day of week
export const weekCountByWeekDay = (year: number, month: number, weekDay: WeekDayValue): number => {
  let anchorDate = new Date(year, month, 1);
  while (anchorDate.getDay() !== weekDay) {
    anchorDate.setDate(anchorDate.getDate() + 1);
  }

  let count = 0;
  while (anchorDate.getMonth() === month) {
    count += 1;
    anchorDate.setDate(anchorDate.getDate() + 7);
  }

  return count;
}


/**
 * Find nearest date in past of a date List, optional for check current too
 */
 export const findNearestDateInPast = (time: Date, dates: Date[], includeCurrent: boolean = false) => {
  const list = [ ...dates ].sort((a, b) => a.getTime() - b.getTime());
  for (let i = list.length - 1; i >=0; i--) {
    const date = list[i];
    if ((date < time) || (includeCurrent && (date.getTime() === time.getTime()))) {
      return date;
    }
  }
};

export const getNearestDateInDayCycle = (start: Date, date: Date, every: number): AnchorCycleDate => {
  const anchorDay = startOfDate(start);
  const deltaDay = Math.floor((date.getTime() - start.getTime()) / ONE_DAY);

  // Get the nearest date in past in the cycle
  const cycle = Math.floor(deltaDay / every);
  const dateInPrevCycle = new Date(anchorDay.getTime() + cycle*(every*ONE_DAY));
  dateInPrevCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());

  return {
    date: dateInPrevCycle,
    cycle
  };
};

export const getNearestDateInWeekCycle = (start: Date, date: Date, every: number, weekDays: WeekDay[]): AnchorCycleDate => {
  const anchorWeek = startOfDate(getMonday(start));
  const dateSOD = startOfDate(date);
  const deltaDay = Math.floor((dateSOD.getTime() - anchorWeek.getTime()) / ONE_DAY);

  // Check current date in cycle or not
  const inCycle = Math.floor(deltaDay / 7) % every === 0;
  const cycle = Math.floor(deltaDay / (7*every));
  let dates: any[];
  weekDays = [toWeekDay(Object.values(WeekDayValue).find((v) => v === start.getDay()) as number)];

  // If the current date is in the cycle, we check all dates in this week and compare
  // with the nearest date in past.
  // If the nearest date is not found, then we check with the max dates of previous cycle
  if (inCycle) {
    const dateStart = new Date(date.getTime());
    dateStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    dates = listDatesInWeekByWeekDays(dateStart, weekDays);
    if (cycle === 0) {
      dates.push(start);
    }
    let pastDateInWeek = findNearestDateInPast(date, dates, true);
    if (pastDateInWeek) {
      if (pastDateInWeek < start) {
        pastDateInWeek = start;
      }

      return {
        date: new Date(pastDateInWeek.getTime()),
        cycle
      };
    } else if (cycle > 0) {
      const dateInPrevCycle = new Date(anchorWeek.getTime() + (cycle-1)*(7*every*ONE_DAY));
      dateInPrevCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
      dates = listDatesInWeekByWeekDays(dateInPrevCycle, weekDays);
      return {
        date: new Date(Math.max(...dates)),
        cycle: cycle-1
      };
    }
  } else {
    // If the current date isn't in the cycle, then we check with the max dates of previous cycle
    const dateInPrevCycle = new Date(anchorWeek.getTime() + cycle*(7*every*ONE_DAY));
    dateInPrevCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    dates = listDatesInWeekByWeekDays(dateInPrevCycle, weekDays);
    if (cycle === 0) {
      dates.push(start);
    }
    return {
      date: new Date(Math.max(...dates)),
      cycle
    };
  }
};

export const getNearestDateInMonthCycle = (start: Date, date: Date, every: number, each: number[], onThe: RepeatOn): AnchorCycleDate => {
  const anchorDay = firstDayOfMonth(start);
  anchorDay.setHours(0, 0, 0, 0);
  const dateSOD = new Date(date.getTime());
  dateSOD.setHours(0, 0, 0, 0);

  // Check current date in cycle or not
  const diff = monthDiff(anchorDay, dateSOD);
  const inCycle = diff % every === 0;
  const cycle = Math.floor(diff / every);
  let dates: any[];

  each = [start.getDate()];

  // If the current date is in the cycle, we check all dates in this month and compare
  // with the nearest date in past.
  // If the nearest date is not found, then we check with the max dates of previous cycle
  if (inCycle) {
    const dateStart = new Date(date.getTime());
    dateStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    dates = each?.length ? listDatesInMonthByDays(dateStart, each) : listDatesInMonthByWeekDayRule(dateStart, onThe);
    if (cycle === 0) {
      dates.push(start);
    }

    let pastDateInWeek = findNearestDateInPast(date, dates, true);
    if (pastDateInWeek) {
      if (pastDateInWeek < start) {
        pastDateInWeek = start;
      }

      return {
        date: new Date(pastDateInWeek.getTime()),
        cycle
      };
    } else if (cycle > 0) {
      const dateInPrevCycle = new Date(anchorDay.getTime());
      dateInPrevCycle.setMonth(dateInPrevCycle.getMonth() + (cycle-1)*every);
      dateInPrevCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
      dates = each?.length ? listDatesInMonthByDays(dateInPrevCycle, each) : listDatesInMonthByWeekDayRule(dateInPrevCycle, onThe);
      return {
        date: new Date(Math.max(...dates)),
        cycle: cycle-1
      };
    }
  } else {
    // If the current date isn't in the cycle, then we check with the max dates of previous cycle
    const dateInPrevCycle = new Date(anchorDay.getTime());
    dateInPrevCycle.setMonth(dateInPrevCycle.getMonth() + cycle*every);
    dateInPrevCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    dates = each?.length ? listDatesInMonthByDays(dateInPrevCycle, each) : listDatesInMonthByWeekDayRule(dateInPrevCycle, onThe);
    if (cycle === 0) {
      dates.push(start);
    }
    return {
      date: new Date(Math.max(...dates)),
      cycle: cycle
    };
  }
};

export const getNearestDateInYearCycle = (start: Date, date: Date, every: number, months: number[], onThe: RepeatOn): AnchorCycleDate => {
  const anchorDay = firstDayOfMonth(start);
  anchorDay.setHours(0, 0, 0, 0);
  const dateSOD = new Date(date.getTime());
  dateSOD.setHours(0, 0, 0, 0);

  // Check current date in cycle or not
  const diff = date.getFullYear() -start.getFullYear();
  const inCycle = diff % every === 0;
  const cycle = Math.floor(diff / every);
  let dates: any[];

  // If the current date is in the cycle, we check all dates in this month and compare
  // with the nearest date in past.
  // If the nearest date is not found, then we check with the max dates of previous cycle
  if (inCycle) {
    const dateStart = new Date(date.getTime());
    dateStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    dates = listDatesInYearByMonths(dateStart, months, onThe);
    if (cycle === 0) {
      dates.push(start);
    }

    let pastDateInWeek = findNearestDateInPast(date, dates, true);
    if (pastDateInWeek) {
      if (pastDateInWeek < start) {
        pastDateInWeek = start;
      }
      return {
        date: new Date(pastDateInWeek.getTime()),
        cycle
      };
    } else if (cycle > 0) {
      const dateInPrevCycle = new Date(anchorDay.getTime());
      dateInPrevCycle.setMonth(dateInPrevCycle.getMonth() + (cycle-1)*every);
      dateInPrevCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
      dates = listDatesInYearByMonths(dateInPrevCycle, months, onThe);
      return {
        date: new Date(Math.max(...dates)),
        cycle: cycle-1
      };
    }
  } else {
    // If the current date isn't in the cycle, then we check with the max dates of previous cycle
    const dateInPrevCycle = new Date(anchorDay.getTime());
    dateInPrevCycle.setMonth(dateInPrevCycle.getMonth() + cycle*every);
    dateInPrevCycle.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    dates = listDatesInYearByMonths(dateInPrevCycle, months, onThe);
    if (cycle === 0) {
      dates.push(start);
    }
    return {
      date: new Date(Math.max(...dates)),
      cycle: cycle
    };
  }
};

export const getDateInCycle = (start: Date, every: number, cycle: number): Date => {
  const deltaDay = cycle*every;
  const d = new Date(start.getTime());
  d.setDate(d.getDate() + deltaDay);
  return d;
};

export const getNextDate = (date: Date, delta: number = 1) => {
  const current = new Date(date);
  return new Date(current.setDate(current.getDate() + delta));
};

export const minToEventText = (min: number) => {
  if (min < 0) return '';

  const oneHour = 60;
  const oneDay = oneHour*24;
  const oneWeek = oneDay*7;

  if (min === 0) return `now`;
  if (min < oneHour) return `${min}min`;
  if (min < oneDay) {
    const h = Math.floor(min / oneHour);
    const m = min % oneHour;
    if (m === 0) {
      return `${h}hr`;
    }
    return `${h}hr${m}min`;
  }

  if (min < oneWeek) {
    const d = Math.floor(min / oneDay);
    const h = Math.floor((min % oneDay) / oneHour);
    const m = min % oneDay % oneHour;
    if (m === 0) {
      if (h === 0) {
        return `${d}day`;
      }
      return `${d}day ${h}hr`;
    } else {
      if (h === 0) {
        return `${d}day ${m}min`;
      }
      return `${d}day ${h}hr${m}min`;
    }
  }

  const w = Math.floor(min / oneWeek);
  return `${w}week`;
};

export const firstDayOfWeek = (date: Date): Date => {
  const d = new Date(date.getTime());
  return new Date(d.setDate(d.getDate() - d.getDay()));
};

export const lastDayOfWeek = (date: Date): Date => {
  const d = new Date(date.getTime());
  return new Date(d.setDate(d.getDate() - d.getDay() + 6));
};

export const addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
}

export const getMonthAndDayFromDate = (date) => {
  const d = new Date(date);
  return `${d.getMonth() + 1}-${d.getDate()}`; // Month in JS start by 0
}

export const getTimezoneOffset = (year: number, month: number, day: number, hour: number, min: number, sec: number, ianaTz: string): number => {
  const date = new Date(Date.UTC(year, month, day, hour, min, sec));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: ianaTz }));
  const offset = utcDate.getTime() - tzDate.getTime();

  return offset / (1000*60);
};

export const tzHasDst = (ianaTz: string): boolean => {
  const year = new Date().getFullYear();
  const offsetJan = getTimezoneOffset(year, 0, 1, 0, 0, 0, ianaTz);
  const offsetJul = getTimezoneOffset(year, 6, 1, 0, 0, 0, ianaTz);
  return offsetJan !== offsetJul;
};

export const stdTimezoneOffset = (date: Date, ianaTz: string): number => {
  const year = date.getUTCFullYear();
  const offsetJan = getTimezoneOffset(year, 0, 1, 0, 0, 0, ianaTz);
  const offsetJul = getTimezoneOffset(year, 6, 1, 0, 0, 0, ianaTz);

  return Math.max(offsetJan, offsetJul);
};

export const savingTimeOffset = (ianaTz: string): number => {
  const year = new Date().getFullYear();
  const offsetJan = getTimezoneOffset(year, 0, 1, 0, 0, 0, ianaTz);
  const offsetJul = getTimezoneOffset(year, 6, 1, 0, 0, 0, ianaTz);

  return offsetJan - offsetJul;
};

export const isDstObserved = (date: Date, ianaTz: string): boolean => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const min = date.getUTCMinutes();
  const sec = date.getUTCSeconds();
  return getTimezoneOffset(year, month, day, hour, min, sec, ianaTz) < stdTimezoneOffset(date, ianaTz);
};

export const isValidTimeZone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  }
  catch (ex) {
    return false;
  }
}