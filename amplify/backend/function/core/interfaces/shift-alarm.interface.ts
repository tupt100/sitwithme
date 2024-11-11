export enum ShiftAlarmType {
  STAFF_SHIFT_ALERT = 'staff.shift.alert',
  PATRON_SHIFT_ALERT = 'patron.shift.alert',
  PATRON_SHIFT_START = 'patron.shift.start',
  PATRON_SHIFT_END = 'patron.shift.end'
}

export interface CreateShiftAlarmInput {
  id?: string;
  shiftID: string;
  stepFuncExecArn: string;
  stepFuncExecStartDate: string;
  type: ShiftAlarmType;
  recipientProfileID: string;
}

export interface ShiftAlarm {
  id: string;
  __typename: string;
  shiftID: string;
  stepFuncExecArn: string;
  stepFuncExecStartDate: string;
  type: ShiftAlarmType;
  recipientProfileID: string;
  createdAt?: string;
  updatedAt?: string;
}
