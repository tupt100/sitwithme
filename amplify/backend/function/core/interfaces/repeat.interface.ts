export interface EventRange {
  start: Date;
  end: Date;
}

export interface RepeatOn {
  weekDay: WeekDay;
  sequence: number;
}

export interface Repeat {
  frequency: RepeatFrequency;
  every: number;
  weekDay?: WeekDay[];
  each?: number[];
  onThe?: RepeatOn;
  month?: number[];
}

export enum RepeatFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export enum WeekDay {
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY'
}
