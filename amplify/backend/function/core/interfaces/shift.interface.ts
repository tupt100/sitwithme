import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Repeat } from "./repeat.interface";

export interface ShiftInput {
  jobID: string;
  start: string;
  end: string;
  repeat?: Repeat;
  workplaceID: string;
  profileID: string;
  parentID?: string;
  excepts?: string[];
  alert?: number;
  endRepeat?: string;
  endHidden?: boolean;
  ianaTz?: string;
}

export interface ShiftUpdateInput {
  jobID?: string;
  start?: string;
  end?: string;
  repeat?: Repeat;
  workplaceID?: string;
  alert?: number;
  endHidden?: boolean;
  ianaTz?: string;
}

export interface ShiftInputRequest {
  jobID: string;
  start: string;
  end: string;
  repeat?: Repeat;
  workplaceID: string;
}

export interface Shift {
  id: string;
  __typename: string;
  jobID: string;
  start: string | Date;
  end: string | Date;
  repeat?: Repeat;
  workplaceID: string;
  profileID: string;
  createdAt?: string;
  updatedAt?: string;
  startInDate?: Date;
  endInDate?: Date;
  endDate?: string;
  cycle?: number;
  endRepeat?: string | Date;
  excepts?: {
    wrapperName: string;
    values: string[];
    type: string;
  };
  duty?: {
    [key: string]: boolean;
  }
  parentID?: string;
  alert?: number;
  endHidden?: boolean;
  ianaTz?: string;
  savingTime?: SavingTime;
}

export interface ShiftEvent {
  startDate?: Date | string;
  endDate?: Date | string;
  shifts: Shift[];
}

export interface EventRangeInDate {
  date: Date;
  rangeInDate: {
    start: Date;
    end: Date;
  }
}

export interface EventRangesInDate {
  date: Date;
  range: [{
    start: Date;
    end: Date;
    cycle: number;
    startInDate: Date;
    endInDate: Date;
  }]
}

export interface EventRangesInDateV2 {
  startDate: Date;
  endDate: Date;
  range: [{
    start: Date;
    end: Date;
  }]
}

export interface ShiftEventDetailByID {
  id: string;
  start: Date;
}

export interface ShiftEventDetail {
  shift: Shift;
  start: Date;
}

export interface AnchorShiftEvent {
  start: Date;
  end: Date;
}

export enum SavingTime {
  DST = 'DST',
  STD = 'STD',
}