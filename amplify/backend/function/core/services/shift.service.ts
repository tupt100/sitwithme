import { ErrorCodeConst } from '@swm-core/constants/error-code.const';
import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { ExploreProfile, ExploreProfileDutyRanges } from '@swm-core/interfaces/explore-profile.interface';
import { Profile } from '@swm-core/interfaces/profile.interface';
import { NotificationSNSMessage, NotificationType } from '@swm-core/interfaces/push-notification.interface';
import { Repeat } from '@swm-core/interfaces/repeat.interface';
import { EventRangesInDate, EventRangesInDateV2, SavingTime, Shift, ShiftEvent, ShiftEventDetail, ShiftEventDetailByID, ShiftInput, ShiftUpdateInput } from '@swm-core/interfaces/shift.interface';
import { Workplace } from '@swm-core/interfaces/workplace.interface';
import { changed } from '@swm-core/utils/comparison.util';
import { dateInTz, endOfDate, isDstObserved, isValidTimeZone, lastDayOfWeek, ONE_DAY, savingTimeOffset, startOfDate, toDateString, toReadbleString, tzHasDst } from '@swm-core/utils/date.util';
import { asyncFilter } from '@swm-core/utils/fn.util';
import { removeEmptyArray } from '@swm-core/utils/normalization.util';
import { hasAttr } from '@swm-core/utils/validation.util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from './dynamodb.service';
import { JobService } from './job.service';
import { ProfileService } from './profile.service';
import { ShiftRepeatService } from './shift-repeat.service';
import { ShiftSearchService } from './shift-search.service';
import { SNSService } from './sns-service';
import { WorkplaceService } from './workplace.service';

const {
  PUSH_NOTIFICATION_TOPIC_ARN,
  API_SITWITHME_SHIFTTABLE_NAME
} = process.env;

const VALIDATION_FAILED_MSG = 'Validation failed';

const dynamoDBService = new DynamoDBService();
const shiftRepeatService = new ShiftRepeatService();
const profileService = new ProfileService();
const workplaceService = new WorkplaceService();
const jobService = new JobService();
const snsService = new SNSService();
const shiftSearchService = new ShiftSearchService();

export class ShiftService {
  async create(input: ShiftInput, tz: number = 0): Promise<Shift> {
    // validate
    await this.validateShiftInput(input, tz);

    // clean the input
    if (input.repeat) {
      input.repeat = shiftRepeatService.normalizeRepeatInput(input.repeat);
    }

    // insert
    const shift: Shift = {
      id: uuidv4(),
      __typename: 'Shift',
      jobID: input.jobID,
      start: new Date(input.start).toISOString(),
      end: new Date(input.end).toISOString(),
      repeat: input.repeat,
      workplaceID: input.workplaceID,
      profileID: input.profileID,
      parentID: input.parentID,
      alert: input.alert,
      endHidden: input.endHidden || false,
      ianaTz: input.ianaTz,
      savingTime: this.getSavingTimeFromTZ(new Date(input.start), input.ianaTz),
      createdAt: new Date().toISOString(),
    };
    const params = {
      TableName: API_SITWITHME_SHIFTTABLE_NAME,
      Item: shift
    };
    console.log('Create shift: ', shift);
    await dynamoDBService.put(params);

    // update `excepts` if have
    if (input.excepts) {
      const params = { excepts: dynamoDBService.dbClient.createSet(input.excepts) };
      await dynamoDBService.update({
        TableName: API_SITWITHME_SHIFTTABLE_NAME,
        Key: { id: shift.id },
        ...dynamoDBService.buildUpdateExpression({ 'ADD': params })
      });
    }

    return shift;
  }

  async update(id: string, input: ShiftUpdateInput, tz: number = 0, shift?: Shift): Promise<Shift> {
    // exist shift
    const oldShift = shift || await this.get(id);

    // validate
    await this.validateShiftUpdateInput(input, oldShift, tz);

    // clean the input
    if (input.repeat) {
      input.repeat = shiftRepeatService.normalizeRepeatInput(input.repeat);
    }

    // insert
    const shiftParams: any = { ...input };
    if (input.start) {
      shiftParams.start = new Date(input.start).toISOString();
    }
    if (input.end) {
      shiftParams.end = new Date(input.end).toISOString();
    }

    if (input.ianaTz && input.ianaTz !== oldShift.ianaTz) {
      shiftParams.savingTime = this.getSavingTimeFromTZ(new Date(shiftParams.start), input.ianaTz);
    }

    const params = {
      TableName: API_SITWITHME_SHIFTTABLE_NAME,
      Key: { id },
      ...dynamoDBService.buildUpdateExpression({ 'SET': shiftParams }),
      ReturnValues: "ALL_NEW"
    };

    const result = await dynamoDBService.update(params);
    return result.Attributes as Shift;
  }

  async get(id: string): Promise<Shift> {
    return <Shift>(await dynamoDBService.get({
      TableName: process.env.API_SITWITHME_SHIFTTABLE_NAME,
      Key: { id },
    })).Item;
  }

  async getShiftEventDetailByID(input: ShiftEventDetailByID): Promise<Shift> {
    const shift: Shift = await this.get(input.id);
    return this.getShiftEventDetail({ shift, start: input.start });
  }

  getShiftEventDetail(input: ShiftEventDetail): Shift {
    const endRepeat = input.shift.endRepeat ? new Date(input.shift.endRepeat) : null;
    const event = shiftRepeatService.listShiftEventsByDate(
      input.shift.repeat,
      new Date(input.shift.start),
      new Date(input.shift.end),
      input.start,
      endRepeat,
      input.shift.excepts?.values.map((e) => new Date(e))
    );
    if (event) {
      return { ...input.shift, ...event };
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async validateShiftInput(input: ShiftInput, tz: number) {
    const errors = { job: [], start: [], end: [], workplace: [], profile: [], repeat: [], alert: [], ianaTz: [] };
    if (!input.start) {
      errors.start.push('Start date is required');
    }
    if (!input.end) {
      errors.end.push('End date is required');
    }
    if (!input.jobID) {
      errors.job.push('Job is required');
    }
    if (input.jobID) {
      let job = await jobService.get(input.jobID);
      if (!job) {
        errors.job.push('Job not found');
      }
    }
    if (!input.profileID) {
      errors.profile.push('Profile is required');
    }
    if (!input.workplaceID) {
      errors.workplace.push('Workplace is required');
    }
    if (input.workplaceID) {
      let workplace: Workplace = await workplaceService.get(input.workplaceID);
      if (!workplace) {
        errors.workplace.push('Workplace not found');
      }
    }

    if (input.start && input.end) {
      const start = new Date(input.start);
      const end = new Date(input.end);
      if (end < start) {
        errors.start.push('The start date must be before the end date');
      } else {
        const deltaDay = Math.floor((end.getTime() - start.getTime()) / ONE_DAY);
        if (deltaDay > 0) {
          errors.end.push('The end time does not exceed 24 hours');
        }
      }
    }

    if (typeof input.alert !== 'undefined' && input.alert !== null
      && input.alert < 0) {
      errors.alert.push('Alert should be equal or greater than zero');
    }

    // validate repeat
    if (input.repeat) {
      const validateResult = shiftRepeatService.validateRepeatRule(input.repeat);
      if (validateResult.errors?.length) {
        errors.repeat = errors.repeat.concat(validateResult.errors);
      }
    }

    if (input.ianaTz && !isValidTimeZone(input.ianaTz)) {
      errors.ianaTz.push('Timezone is invalid format');
    }

    removeEmptyArray(errors);

    if (Object.keys(errors).length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }

    // validate overlap time with other shifts
    if (input.start && input.end) {
      const start = new Date(input.start);
      const end = new Date(input.end);
      const rangeEnd = new Date(input.start);
      rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);
      const shifts = await this.listShiftsByProfileID(input.profileID);
      const errorMsg = await this.validateEventRangeOverlapShifts(start, end, input.repeat, start, rangeEnd, tz, input.excepts?.map(e => new Date(e)), shifts);
      if (errorMsg) {
        errors.start = errors.start || [];
        errors.start.push(errorMsg);
        throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
      }
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async validateShiftUpdateInput(input: ShiftUpdateInput, shift: Shift, tz: number) {
    const errors = { job: [], start: [], end: [], workplace: [], profile: [], repeat: [], alert: [], ianaTz: [] };
    let start: Date;
    let end: Date;
    let repeat: any;
    if (hasAttr(input, 'start')) {
      if (!input.start) {
        errors.start.push('Start date is required');
        start = new Date(shift.start);
      } else {
        start = new Date(input.start);
      }
    }
    if (hasAttr(input, 'end')) {
      if (!input.end) {
        errors.end.push('End date is required');
        end = new Date(shift.end);
      } else {
        end = new Date(input.end);
      }
    }

    if (hasAttr(input, 'jobID')) {
      if (!input.jobID) {
        errors.job.push('Job is required');
      }
      if (input.jobID) {
        let job = await jobService.get(input.jobID);
        if (!job) {
          errors.job.push('Job not found');
        }
      }
    }
    if (hasAttr(input, 'workplaceID')) {
      if (!input.workplaceID) {
        errors.workplace.push('Workplace is required');
      }
      if (input.workplaceID) {
        let workplace: Workplace = await workplaceService.get(input.workplaceID);
        if (!workplace) {
          errors.workplace.push('Workplace not found');
        }
      }
    }

    if (end < start) {
      errors.start.push('The start date must be before the end date');
    } else {
      const deltaDay = Math.floor((end.getTime() - start.getTime()) / ONE_DAY);
      if (deltaDay > 0) {
        errors.end.push('The end time does not exceed 24 hours');
      }
    }

    if (hasAttr(input, 'alert')
      && typeof input.alert !== 'undefined' && input.alert !== null
      && input.alert < 0) {

      errors.alert.push('Alert should be equal or greater than zero');
    }

    // validate repeat
    if (hasAttr(input, 'repeat')) {
      if (input.repeat) {
        const validateResult = shiftRepeatService.validateRepeatRule(input.repeat);
        if (validateResult.errors?.length) {
          errors.repeat = errors.repeat.concat(validateResult.errors);
        }
      }
      repeat = input.repeat;
    } else {
      repeat = shift.repeat;
    }

    if (input.ianaTz && !isValidTimeZone(input.ianaTz)) {
      errors.ianaTz.push('Timezone is invalid format');
    }

    removeEmptyArray(errors);

    if (Object.keys(errors).length) {
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }

    // validate overlap time with other shifts
    const rangeEnd = new Date(start);
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);
    let shifts = await this.listShiftsByProfileID(shift.profileID);
    if (!shift.repeat) {
      shifts = shifts.filter((s) => s.id !== shift.id);
    }
    const errorMsg = await this.validateEventRangeOverlapShifts(start, end, repeat, start, rangeEnd, tz, [], shifts);
    if (errorMsg) {
      errors.start = errors.start || [];
      errors.start.push(errorMsg);
      throw new BadRequestException(VALIDATION_FAILED_MSG, ErrorCodeConst.Validation, errors);
    }
  }

  /**
   * The event range must not be overlap with other shift events in 1 year.
   * We need to fetch all shift events in 1 year, then get closest event range of current and compare
   *
   * 1. Fetch all shift event in 1 year from current time.
   * 2. Get closest events range and compare.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async validateEventRangeOverlapShifts(start: Date, end: Date, repeat: Repeat, rangeStart: Date, rangeEnd: Date, tz: number, excepts: Date[], shifts: Shift[]) {
    const currentShiftEvent = {};
    let error: string;
    const eventRanges: EventRangesInDate[] = shiftRepeatService.listShiftEventsWithRepeatRule(repeat, start, end, rangeStart, rangeEnd, null, excepts);

    for (const event of eventRanges) {
      let shiftEvents = currentShiftEvent[`${event.date.getTime()}`]; // group by date
      if (!shiftEvents) {
        currentShiftEvent[`${event.date.getTime()}`] = [];
        shiftEvents = currentShiftEvent[`${event.date.getTime()}`];
      }
      event.range.forEach((range) => {
        shiftEvents.push({ ...range });
      });
    }

    for (const shift of shifts) {
      const shiftStart = new Date(shift.start);
      const shiftEnd = new Date(shift.end);
      const shiftEndRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
      const eventRanges: EventRangesInDate[] = shiftRepeatService.listShiftEventsWithRepeatRule(
        shift.repeat,
        shiftStart,
        shiftEnd,
        rangeStart,
        rangeEnd,
        shiftEndRepeat,
        shift.excepts?.values.map((e) => new Date(e))
      );

      for (const event of eventRanges) {
        const shiftEvents = currentShiftEvent[`${event.date.getTime()}`];
        if (shiftEvents?.length) {
          for (const shiftEvent of shiftEvents) {
            for (const range of event.range) {
              const rs = (shiftEvent.start.getTime() < range.end.getTime() && shiftEvent.end.getTime() > range.start.getTime());
              if (rs) {
                const workplace = await workplaceService.get(shift.workplaceID);
                error = `This shift is duplicate with time ${toReadbleString(dateInTz(range.start, tz))} - ${toReadbleString(dateInTz(range.end, tz))}`;
                if (workplace) {
                  error += ` at ${workplace.name}`;
                }
                return error;
              }
            }
          }
        }
      }
    }

    return error;
  }

  async listShiftsByProfileID(profileID: string): Promise<Shift[]> {
    const params = {
      TableName: API_SITWITHME_SHIFTTABLE_NAME,
      IndexName: 'byProfile',
      KeyConditionExpression: '#profileID = :profileID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID'
      },
      ExpressionAttributeValues: {
        ':profileID': profileID
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      return result.Items as Shift[];
    }

    return [];
  }

  // Generate shift events group by date
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async listShiftEventsByDateRange(shifts: Shift[], rangeStart: Date, rangeEnd: Date, sort = true, tz: number = 0): Promise<ShiftEvent[]> {
    let shiftEvents: ShiftEvent[] = [];

    for (const shift of shifts) {
      const shiftStart = new Date(shift.start);
      const shiftEnd = new Date(shift.end);
      const shiftEndRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
      const eventRanges: EventRangesInDateV2[] = shiftRepeatService.listShiftEventsWithRepeatRuleV2(
        shift.repeat,
        shiftStart,
        shiftEnd,
        rangeStart,
        rangeEnd,
        tz,
        shiftEndRepeat,
        shift.excepts?.values.map((e) => new Date(e))
      );
      for (const event of eventRanges) {
        const _startDateStr = toDateString(event.startDate);
        const _endDateStr = toDateString(event.endDate);
        let shiftEvent: ShiftEvent = shiftEvents.find((e) => e.startDate === _startDateStr && e.endDate === _endDateStr); // group by date
        if (!shiftEvent) {
          shiftEvent = { startDate: _startDateStr, endDate: _endDateStr, shifts: [] };
          shiftEvents.push(shiftEvent);
        }
        event.range.forEach((range) => {
          shiftEvent.shifts.push({
            ...shift,
            ...range
          });
        });
      }
    }

    if (sort) {
      shiftEvents.sort((a, b) => {
        if (a.startDate === b.startDate) {
          return (a.endDate < b.endDate) ? -1 : 1;
        }

        return (a.startDate < b.startDate) ? -1 : 1;
      });

      shiftEvents.forEach((s) => {
        s.shifts.sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime());
      });
    }

    return shiftEvents;
  }

  async listStaffShiftEventsByDateRange(profileID: string, rangeStart: Date, rangeEnd: Date, tz: number = 0): Promise<ShiftEvent[]> {
    // 1. Fetch all Staff Shifts
    const shifts = await this.listShiftsByProfileID(profileID);

    // 2. Generate shift events group by date
    return this.listShiftEventsByDateRange(shifts, rangeStart, rangeEnd, true, tz);
  }

  /**
   * Free Patron can see staff schedule in the current week + next 2 weeks
   *
   * @param profileID staffID
   * @param tz timezone in minutes
   */
  async listStaffShiftEventsForPremium(profileID: string, tz: number = 0): Promise<ShiftEvent[]> {
    const now = new Date();
    const end = lastDayOfWeek(now);
    const oneWeek = 7;
    end.setDate(end.getDate() + oneWeek*2); // next 2 weeks
    return this.listStaffShiftEventsByDateRange(profileID, dateInTz(now, tz), dateInTz(end, tz), tz);
  }

  /**
   * Free Patron can see staff schedule today
   *
   * @param profileID staffID
   * @param tz timezone in minutes
   */
  async listStaffShiftEventsForFree(profileID: string, tz: number = 0): Promise<ShiftEvent[]> {
    const now = new Date();
    return this.listStaffShiftEventsByDateRange(profileID, dateInTz(now, tz), dateInTz(now, tz), tz);
  }

  /**
   * tz in minutes
   */
  async listUserShiftEventsByDateRange(userID: string, rangeStart: Date, rangeEnd: Date, tz: number = 0): Promise<ShiftEvent[]> {
    // 1. Find Staff profile
    const profile = await profileService.getStaffByUserID(userID);
    if (!profile) {
      throw new BadRequestException('Staff not found');
    }

    return this.listStaffShiftEventsByDateRange(profile.id, rangeStart, rangeEnd, tz);
  }

  isStaffWorkingFrom(shift: Shift, date: Date): boolean {
    const endTime = this.getShiftEndDate(shift);
    if (endTime) {
      return date.getTime() <= endTime.getTime();
    }
    return true;
  }

  /**
   * 1. Profile must not blocked/be blocked by current profile
   * 2. Profile must not be deleted
   */
  async listNoneBlockedProfilesWorkingByYelpBusinessID(yelpBusinessID: string, profileID: string): Promise<Profile[]> {
    const profiles = await this.listProfilesWorkingByYelpBusinessID(yelpBusinessID);
    return profiles.filter(profile => !profile.blockedProfileIDs?.values?.find(id => id === profileID) || !profile.userConnection.deleted);
  }

  async listProfilesWorkingByYelpBusinessID(yelpBusinessID: string): Promise<Profile[]> {
    const now = new Date();
    let shifts = await shiftSearchService.listWorkingShiftsByYelpBusinessID(yelpBusinessID);
    console.log('listShiftsByYelpBusinessID run in: ', new Date().getTime() - now.getTime(), shifts);
    if (shifts.length) {
      const profileUniqueIDs = Array.from(new Set(shifts.map(s => s.profileID)));
      let profiles = await profileService.batchGet(profileUniqueIDs);

      // Sort profiles by fullName
      profiles.sort((a, b) => a.userConnection.fullName.localeCompare(b.userConnection.fullName));

      console.log('listProfilesWorkingByYelpBusinessID run in: ', new Date().getTime() - now.getTime());
      return profiles;
    }

    return [];
  }

  /**
   * List all shifts by yelpBusinessID:
   *
   * 1. List all workplaces that has same `yelpBusinessID`
   * 2. List all shifts by workplaces
   */
  async listShiftsByYelpBusinessID(yelpBusinessID: string): Promise<Shift[]> {
    // 1. List all workplaces that has same `yelpBusinessID`
    const workplaces = await workplaceService.listWorkplacesByYelpBusinessID(yelpBusinessID);

    // 2. List all shifts by workplaces
    return (await Promise.all(workplaces.map(async workplace => await this.listShiftsByWorkplaceID(workplace.id)))).flat();
  }

  async listShiftsByWorkplaceID(workplaceID: string): Promise<Shift[]> {
    const result = await dynamoDBService.query({
      TableName: process.env.API_SITWITHME_SHIFTTABLE_NAME,
      IndexName: 'byWorkplaceID',
      KeyConditionExpression: '#workplaceID = :workplaceID',
      ExpressionAttributeNames: {
        '#workplaceID': 'workplaceID'
      },
      ExpressionAttributeValues: {
        ':workplaceID': workplaceID
      },
    });
    if (result.Items?.length > 0) {
      return result.Items as Shift[];
    }
    return [];
  }

  async listShiftsByExploreProfile(profileID: string, workplaceID: string, jobID: string): Promise<Shift[]> {
    const params = {
      TableName: API_SITWITHME_SHIFTTABLE_NAME,
      IndexName: 'byProfile',
      KeyConditionExpression: '#profileID = :profileID',
      FilterExpression: '#workplaceID = :workplaceID AND #jobID = :jobID',
      ExpressionAttributeNames: {
        '#profileID': 'profileID',
        '#workplaceID': 'workplaceID',
        '#jobID': 'jobID',
      },
      ExpressionAttributeValues: {
        ':profileID': profileID,
        ':workplaceID': workplaceID,
        ':jobID': jobID,
      }
    };
    const result = await dynamoDBService.query(params);
    if (result && result.Items.length > 0) {
      result.Items = result.Items.map((shift: Shift) => {
        const endDate = this.getShiftEndDate(shift);
        shift.endDate = endDate ? new Date(endDate).toISOString() : null;
        return shift;
      });
      return result.Items as Shift[];
    }

    return [];
  }

  getShiftEndDate(shift: Shift): Date {
    let endDate: Date;
    if (shift.repeat && shift.endRepeat) {
      const calculatedEndDate = new Date(`${shift.endRepeat}T${(shift.start as string).split('T')[1]}`).getTime() + (new Date(shift.end).getTime() - new Date(shift.start).getTime());
      endDate = new Date(calculatedEndDate);
    }
    if (!shift.repeat) {
      endDate = new Date(shift.end);
    }
    return endDate;
  }

  async checkDutyFromExploreProfile(exploreProfile: ExploreProfile, date: Date = new Date()) {
    // Get all shifts matched with ExploreProfile and check duty
    const shifts: Shift[] = await this.listShiftsByExploreProfile(exploreProfile.profileID, exploreProfile.workplaceID, exploreProfile.jobID);
    return await this.checkDutyByOriginalShifts(shifts, date);
  }

  async checkDutyByOriginalShifts(_shifts: Shift[], date: Date = new Date()): Promise<Boolean> {
    // find shift events in this day and check duty
    const startDate = startOfDate(date);
    const endDate = endOfDate(date);
    const shiftEvents: ShiftEvent[] = await this.listShiftEventsByDateRange(_shifts, startDate, endDate, false);
    // Merge all shifts by date range
    let shifts: Shift[] = [];
    shiftEvents.forEach(item => { shifts = shifts.concat(item.shifts) });

    const result = await Promise.all(shifts.map(async (item) => {
      if (this.checkDuty(item, new Date(date))) {
        return item;
      }
    }));
    return result.filter(item => item).length ? true : false;
  }

  async checkDutyByProfile(profile: Profile, date: Date): Promise<Boolean> {
    // Get all shifts matched with Profile and check duty
    const shifts: Shift[] = await this.listShiftsByProfileID(profile.id);
    return await this.checkDutyByOriginalShifts(shifts, date);
  }

  /**
   * 1. Throw bad request if staff is not in duty
   * 2. Update duty status will affect to shift until shift end
   *
   * Duty will automatic on in the start time.
   * Duty cannot be changed if user are not in.
   * Setting shift's duty prop can mark a duty is ON/OFF at a shift event
   */
  async switchDuty(userID: string): Promise<boolean> {
    const now = new Date();
    const currentShiftEvent: Shift = await this.getShiftEventAtDay(userID, now);
    if (!currentShiftEvent) {
      throw new BadRequestException(`Updating duty's status will not work if you are not in duty`);
    }

    console.log('Starting switch duty for shift: ', currentShiftEvent);
    const dutyDateTime = new Date(currentShiftEvent.end).toISOString();
    const currentDutyStatus = this.checkDuty(currentShiftEvent, now);
    const isDuty = !currentDutyStatus;

    // 2. Update duty status until shift end
    const updateDutyParams = {
      TableName: API_SITWITHME_SHIFTTABLE_NAME,
      Key: { id: currentShiftEvent.id },
      ReturnValues: 'ALL_NEW',
      ...dynamoDBService.buildUpdateExpression({ 'SET': { duty: { [dutyDateTime]: isDuty }}}),
    }
    await dynamoDBService.update(updateDutyParams);

    // 3. notify to client about current status
    let currentDuty = null;
    if (!isDuty) {
      // If off, notify immediately
      currentDuty = false;
    } else {
      // check again, if staff on duty, then notify
      currentShiftEvent.duty = { [dutyDateTime]: isDuty };
      const duty = this.checkDuty(currentShiftEvent, now);
      if (duty) {
        currentDuty = true;
      }
    }
    if (currentDuty !== null) {
      try {
        const notificationSNSMessage: NotificationSNSMessage = { notificationType: currentDuty ? NotificationType.SHIFT_START : NotificationType.SHIFT_END, body: currentShiftEvent };
        await snsService.publish({
          Message: JSON.stringify(notificationSNSMessage),
          TopicArn: PUSH_NOTIFICATION_TOPIC_ARN,
        });
      } catch (e) {
        console.log('[switchDuty] ERROR: ', e);
      }
    }

    return isDuty;
  }

  /**
   * 1. List all shift event in day
   * 2. Filter event match current time
   * 3. Get current shift event
   */
  async getStaffShiftEventAtDay(profileID: string, date = new Date()): Promise<Shift> {
    const startDate = startOfDate(date);
    const endDate = endOfDate(date);
    const shiftByDateRange: ShiftEvent[] = await this.listStaffShiftEventsByDateRange(profileID, startDate, endDate);
    console.log('shiftByDateRange: ', JSON.stringify(shiftByDateRange, null, 2));
    if (!shiftByDateRange.length) {
      return;
    }

    // Merge all shifts by date range
    let shifts: Shift[] = [];
    shiftByDateRange.forEach(item => { shifts = shifts.concat(item.shifts) });

    // 2. Filter event match current time
    const shiftEventMatchedCurrentTime: Shift[] = shifts.filter(event => {
      console.log('Event matched current time: ', event.start, event.end, date);
      if (
        new Date(event.start).getTime() <= date.getTime() &&
        date.getTime() <= new Date(event.end).getTime()
      ) {
        return event;
      }
    });

    console.log('Shift matched current time: ', JSON.stringify(shiftEventMatchedCurrentTime, null, 2));
    // Exist if no event matched
    if (!shiftEventMatchedCurrentTime.length) {
      return;
    }

    // 3. Get current shift event
    const shiftEvent: Shift = shiftEventMatchedCurrentTime.reduce((event, nextEvent) => {
      if (new Date(event.end).getTime() <= new Date(nextEvent.end).getTime()) {
        return event;
      }
      return nextEvent;
    });
    console.log('Current shift event: ', JSON.stringify(shiftEvent, null, 2));
    return shiftEvent;
  }

  async getShiftEventAtDay(userID: string, date = new Date()): Promise<Shift> {
    // 1. Find Staff profile
    const profile = await profileService.getStaffByUserID(userID);
    if (!profile) {
      throw new BadRequestException('Staff not found');
    }

    return this.getStaffShiftEventAtDay(profile.id, date);
  }

  /**
   * Get duty range and return to format
   * [
   *    {
   *        start: DateTime
   *        end: DateTime
   *    }
   * ]
   */
  getDutyRangesFromShifts(shifts: Shift[], rangeStart: Date, rangeEnd: Date, tz: number = 0): ExploreProfileDutyRanges[] {
    let dutyRanges: ExploreProfileDutyRanges[] = [];
    for (const shift of shifts) {
      const shiftStart = new Date(shift.start);
      const shiftEnd = new Date(shift.end);
      const shiftEndRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
      const eventRanges: EventRangesInDateV2[] = shiftRepeatService.listShiftEventsWithRepeatRuleV2(
        shift.repeat,
        shiftStart,
        shiftEnd,
        rangeStart,
        rangeEnd,
        tz,
        shiftEndRepeat,
        shift.excepts?.values.map((e) => new Date(e))
      );
      console.log('eventRanges', rangeStart, rangeEnd);
      for (const event of eventRanges) {
        dutyRanges.push({
          start: event.startDate.toISOString(),
          end: event.endDate.toISOString()
        });
      }
    }
    return dutyRanges;
  }

  /**
   * Notice: shift params is the Shift event, not the original Shift
   * 1. Check duty with repeat rule
   * 2. Check duty with shift duty (switched on/off)
   */
  checkDuty(shift: Shift, time: Date) {
    const endRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
    const duty = shift.duty;
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    // 1. Check duty with repeat rule
    console.log('Checking duty for shift: ', shift);
    let dutyStatus = shiftRepeatService.checkDutyWithRepeatRule(
      shift.repeat,
      start,
      end,
      time,
      endRepeat,
      shift.excepts?.values?.map(e => new Date(e)),
    );

    // 2. Check duty with shift duty (switched on/off)
    if (duty) {
      const dutyKey = Object.keys(duty)[0];
      const dutyDateTime = dutyKey ? new Date(dutyKey).getTime() : null;
      if (
        dutyDateTime &&
        start.getTime() <= dutyDateTime &&
        dutyDateTime <= end.getTime()
      ) {
        dutyStatus = duty[new Date(dutyKey).toISOString()];
      }
    }
    return dutyStatus;
  }

  /**
   * Update all shift events in future. Only apply for Shift has repeat rule. It means:
   *
   * 1. Throw error if the shift hasn't repeat rule
   * 2. If change at least 1 attribute, then create a new shift with repeat rule
   * 3. Delete the shift events in future
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async updateShiftEventsInFuture(shiftEvent: ShiftEventDetail, input: ShiftUpdateInput, tz: number = 0): Promise<Shift> {
    // 1. Throw error if the shift hasn't repeat rule
    if (!shiftEvent.shift.repeat) {
      throw new BadRequestException("Not support update futures for Shift has no repeat rule");
    }

    const shift: Shift = shiftEvent.shift;
    const range = shiftRepeatService.generateShiftEvent(new Date(shiftEvent.shift.start), new Date(shiftEvent.shift.end), new Date(shiftEvent.start));
    const start = range.start.toISOString();
    const end = range.end.toISOString();

    // 2. If change at least 1 attribute, then create a new shift with repeat rule
    let result: Shift = shiftEvent.shift;
    if (changed(shiftEvent.shift, input)) {
      // create new shift
      const endRepeat = shift.endRepeat ? new Date(shift.endRepeat) : null;
      const shiftInput: ShiftInput = {
        jobID: hasAttr(input, 'jobID') ? input.jobID : shift.jobID,
        workplaceID: hasAttr(input, 'workplaceID') ? input.workplaceID : shift.workplaceID,
        start: hasAttr(input, 'start') ? input.start : start,
        end: hasAttr(input, 'end') ? input.end : end,
        profileID: shift.profileID,
        repeat: hasAttr(input, 'repeat') ? input.repeat : shift.repeat,
        alert: hasAttr(input, 'alert') ? input.alert : shift.alert,
        excepts: shift.excepts?.values,
        endHidden: hasAttr(input, 'endHidden') ? input.endHidden : shift.endHidden,
        ianaTz: hasAttr(input, 'ianaTz') ? input.ianaTz : shift.ianaTz,
      };

      // Update endRepeat
      if (endRepeat) {
        const excepts = shiftInput.excepts?.map(e => new Date(e));
        const shiftStart = new Date(shiftInput.start);
        const shiftEnd = new Date(shiftInput.end);
        const event = shiftRepeatService.listShiftEventsByDate(
          shiftInput.repeat,
          shiftStart, shiftEnd,
          endRepeat,
          endRepeat,
          excepts
        );
        if (event) {
          shiftInput.endRepeat = toDateString(event.start);
        }
      }

      try {
        // 3. Delete the shift events in future
        await this.deleteShiftEventsInFuture(shiftEvent, false);
        result = await this.create(shiftInput, tz);
      } catch (e) {
        // rollback
        await dynamoDBService.put({ TableName: API_SITWITHME_SHIFTTABLE_NAME, Item: shift });

        // update `excepts` if have
        if (shift.excepts?.values) {
          const params = { excepts: dynamoDBService.dbClient.createSet(shift.excepts?.values) };
          await dynamoDBService.update({
            TableName: API_SITWITHME_SHIFTTABLE_NAME,
            Key: { id: shift.id },
            ...dynamoDBService.buildUpdateExpression({ 'SET': params })
          });
        }

        throw e;
      }
    }

    return result;
  }

  async updateShiftEventsByIDInFuture(shiftEvent: ShiftEventDetailByID, input: ShiftUpdateInput): Promise<Shift> {
    const shift: Shift = await this.get(shiftEvent.id);
    return this.updateShiftEventsInFuture({ shift, start: shiftEvent.start }, input);
  }

  /**
   * Update a shift event. It means:
   *
   * If repeat:
   *   1. Create a new shift with non-repeat, related with parent Shift
   *   2. Delete the shift event
   * else:
   *   1. Update this shift record
   *
   * Don't support if Updating the repeat attributes. For updating the repeat rules, pls use `updateShiftEventsInFuture` function
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async updateShiftEvent(shiftEvent: ShiftEventDetail, input: ShiftUpdateInput, tz: number = 0): Promise<Shift> {
    const shift: Shift = shiftEvent.shift;
    const range = shiftRepeatService.generateShiftEvent(new Date(shiftEvent.shift.start), new Date(shiftEvent.shift.end), new Date(shiftEvent.start));
    const start = range.start.toISOString();
    const end = range.end.toISOString();

    let result: Shift = shift;
    if (shift.repeat) {
      if (changed(shift, input)) {
        // reject if changed repeat rule
        if (input.repeat) {
          input.repeat = shiftRepeatService.normalizeRepeatInput(input.repeat);
          if (changed(shift.repeat, input.repeat)) {
            throw new BadRequestException(`Update one shift does not support if updating the repeat. Please use the Update for all Shifts future API.`);
          }
        }

        // 1. Create a new shift with non-repeat
        const shiftInput: ShiftInput = {
          jobID: hasAttr(input, 'jobID') ? input.jobID : shift.jobID,
          workplaceID: hasAttr(input, 'workplaceID') ? input.workplaceID : shift.workplaceID,
          start: hasAttr(input, 'start') ? input.start : start,
          end: hasAttr(input, 'end') ? input.end : end,
          alert: hasAttr(input, 'alert') ? input.alert : shift.alert,
          profileID: shift.profileID,
          parentID: shift.id,
          endHidden: shift.endHidden,
          ianaTz: hasAttr(input, 'ianaTz') ? input.ianaTz : shift.ianaTz,
        };

        try {
          await this.deleteShiftEvent(shiftEvent);
          result = await this.create(shiftInput, tz);
        } catch (e) {
          // rollback
          let params: any = {};
          let action: string;
          if (shift.excepts) {
            params = { excepts: dynamoDBService.dbClient.createSet(shift.excepts.values) };
            action = 'SET';
          } else {
            action = 'REMOVE';
            params = { excepts: true };
          }

          await dynamoDBService.update({
            TableName: API_SITWITHME_SHIFTTABLE_NAME,
            Key: { id: shift.id },
            ...dynamoDBService.buildUpdateExpression({ [action]: params })
          });

          throw e;
        }
      }
    } else {
      // Update this shift record
      if (changed(shift, input)) {
        const shiftUpdateInput: ShiftUpdateInput = {
          jobID: hasAttr(input, 'jobID') ? input.jobID : shift.jobID,
          workplaceID: hasAttr(input, 'workplaceID') ? input.workplaceID : shift.workplaceID,
          start: hasAttr(input, 'start') ? input.start : start,
          end: hasAttr(input, 'end') ? input.end : end,
          repeat: hasAttr(input, 'repeat') ? input.repeat : shift.repeat,
          alert: hasAttr(input, 'alert') ? input.alert : shift.alert,
          endHidden: hasAttr(input, 'endHidden') ? input.endHidden : shift.endHidden,
          ianaTz: hasAttr(input, 'ianaTz') ? input.ianaTz : shift.ianaTz,
        };

        result = await this.update(shift.id, shiftUpdateInput, tz, shift);
      }
    }

    return result;
  }

  async updateShiftEventByID(shiftEvent: ShiftEventDetailByID, input: ShiftUpdateInput, tz: number = 0): Promise<Shift> {
    const shift: Shift = await this.get(shiftEvent.id);
    return this.updateShiftEvent({ shift, start: shiftEvent.start }, input, tz);
  }

  async delete(id: string) {
    const params = {
      TableName: API_SITWITHME_SHIFTTABLE_NAME,
      Key: { id }
    };
    await dynamoDBService.delete(params);
  }

  async queryChildrenShiftsFrom(parentID: string, from: Date): Promise<Shift[]> {
    const result = await dynamoDBService.query({
      TableName: process.env.API_SITWITHME_SHIFTTABLE_NAME,
      IndexName: 'byParentID',
      KeyConditionExpression: '#parentID = :parentID AND #start >= :start',
      ExpressionAttributeNames: {
        '#parentID': 'parentID',
        '#start': 'start'
      },
      ExpressionAttributeValues: {
        ':parentID': parentID,
        ':start': from.toISOString(),
      },
    });
    if (result.Items?.length > 0) {
      return result.Items as Shift[];
    }
    return [];
  }

  async deleteChildrenShiftsFrom(parentID: string, from: Date) {
    const shifts = await this.queryChildrenShiftsFrom(parentID, from);
    await dynamoDBService.batchDelete(API_SITWITHME_SHIFTTABLE_NAME, shifts.map(s => ({ id: s.id })));
  }

  /**
   * Delete all shift events in the future
   *
   * 1. Throw error if the shift hasn't repeat rule
   * 2. Find the previous Shift event
   * 3. Update the original Shift `endRepeat` to previous Shift event start date
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async deleteShiftEventsInFuture(input: ShiftEventDetail, childrenDeleted: boolean = true) {
    // 1. Throw error if the shift hasn't repeat rule
    if (!input.shift.repeat) {
      throw new BadRequestException("Not support delete futures for Shift has no repeat rule");
    }

    // 2. Find the previous Shift event
    const date = new Date(input.start.getTime());
    date.setSeconds(date.getSeconds() - 1);
    const start = new Date(input.shift.start);
    const end = new Date(input.shift.end);

    if (date.getTime() < start.getTime())  {
      // Delete record if the delete shift from begining
      await this.delete(input.shift.id);

      // Delete all children shifts that has start date in the future
      if (childrenDeleted) {
        await this.deleteChildrenShiftsFrom(input.shift.id, start);
      }
    } else {
      // 3. Update the original Shift `endRepeat` to previous Shift event start date
      const oldEndRepeat = input.shift.endRepeat ? new Date(input.shift.endRepeat) : null;
      const event = shiftRepeatService.listShiftEventsByDate(
        input.shift.repeat,
        start,
        end,
        date,
        oldEndRepeat,
        input.shift.excepts?.values.map((e) => new Date(e))
      );
      if (event) {
        await dynamoDBService.update({
          TableName: API_SITWITHME_SHIFTTABLE_NAME,
          Key: { id: input.shift.id },
          ...dynamoDBService.buildUpdateExpression({ 'SET': { endRepeat: toDateString(event.start) } })
        });

        // Delete all children shifts that has start date in the future
        if (childrenDeleted) {
          await this.deleteChildrenShiftsFrom(input.shift.id, event.start);
        }
      } else {
        // Event not found because this Shift event is begining
        // Delete record if the delete shift from begining
        await this.delete(input.shift.id);

        // Delete all children shifts that has start date in the future
        if (childrenDeleted) {
          await this.deleteChildrenShiftsFrom(input.shift.id, input.start);
        }
      }
    }
  }

  async deleteShiftEventsByIDInFuture(input: ShiftEventDetailByID) {
    const shift: Shift = await this.get(input.id);
    return this.deleteShiftEventsInFuture({ shift, start: input.start });
  }

  /**
   * Delete a shift event
   *
   * 1. Find the Shift event need deleted
   * 2. Add Shift event start date to the original Shift record `excepts` column
   */
  async deleteShiftEvent(input: ShiftEventDetail) {
    if (input.shift.repeat) {

      // 1. Find the Shift event need deleted
      const endRepeat = input.shift.endRepeat ? new Date(input.shift.endRepeat) : null;
      const date = new Date(input.start.getTime());
      const shiftStart = new Date(input.shift.start);
      const shiftEnd = new Date(input.shift.end);
      const excepts = input.shift.excepts?.values.map((e) => new Date(e)) || [];
      const event = shiftRepeatService.listShiftEventsByDate(
        input.shift.repeat,
        shiftStart,
        shiftEnd,
        date,
        endRepeat,
        excepts
      );

      // 2. Add Shift event start date to the original Shift record `excepts` column
      if (event) {
        const start = toDateString(event.start);
        const params: any = {
          'ADD': {
            excepts: dynamoDBService.dbClient.createSet([start])
          }
        };

        // 2.1 The date we deleted maybe in the last date Staff working, so we need to update the endRepeat
        if (input.shift.endRepeat && input.shift.endRepeat === start) {
          excepts.push(event.start);
          const prevEvent = shiftRepeatService.getNextEvent(input.shift.repeat, shiftStart, shiftEnd, event.start, endRepeat, -1, excepts);
          if (prevEvent) {
            params['SET'] = { endRepeat: toDateString(prevEvent.start) };
          }
        }

        await dynamoDBService.update({
          TableName: API_SITWITHME_SHIFTTABLE_NAME,
          Key: { id: input.shift.id },
          ...dynamoDBService.buildUpdateExpression(params)
        });
      }
    } else {
      // Delete record if never repeat
      await this.delete(input.shift.id);
    };
  }

  async deleteShiftEventByID(input: ShiftEventDetailByID) {
    const shift: Shift = await this.get(input.id);
    return this.deleteShiftEvent({ shift, start: input.start });
  }

  async hasShiftsUpcoming(profileID: string, from: Date): Promise<boolean> {
    const shifts = await this.listShiftsByProfileID(profileID);
    if (shifts.length) {
      for (const shift of shifts) {
        if (this.isStaffWorkingFrom(shift, from)) {
          return true;
        }
      }
    }

    return false;
  }

  async isStaffWorkingAt(shift: Shift, yelpBusinessID: string): Promise<boolean> {
    const workplace = await workplaceService.get(shift.workplaceID);
    return workplace?.yelpBusinessID === yelpBusinessID;
  }

  async getCurrentShiftByProfileIDAndYelpBusinessID(profileID: string, yelpBusinessID: string): Promise<Shift> {
    const now = new Date();
    let shifts = await this.listShiftsByProfileID(profileID);
    console.log('listShiftsByProfileID: ', profileID, yelpBusinessID, JSON.stringify(shifts, null, 2));
    if (shifts?.length) {
      shifts = shifts.filter((s) => this.isStaffWorkingFrom(s, now));
      console.log('isStaffWorkingFrom: ', JSON.stringify(shifts, null, 2));
      shifts = await asyncFilter(shifts, async (s) => await this.isStaffWorkingAt(s, yelpBusinessID));
      console.log('isStaffWorkingAt: ', JSON.stringify(shifts, null, 2));
      const shift = shifts.find((s) => this.checkDuty(s, now));
      console.log('shift matched duty: ', JSON.stringify(shifts, null, 2));
      return shift || shifts[0];
    }
  }

  async adjustAllShiftsToSavingTime(savingTime: SavingTime) {
    const fromSavingTime = savingTime === SavingTime.DST ? SavingTime.STD : SavingTime.DST;
    const shifts = await this.allShiftsBySavingTime(fromSavingTime);

    if (savingTime === SavingTime.DST) {
      // adjust from STD to DST
      return this.adjustShiftsToDST(shifts);
    } else if (savingTime === SavingTime.STD) {
      // adjust from DST to STD
      return this.adjustShiftsToSTD(shifts);
    }
  }

  async adjustShiftsToSTD(shifts: Shift[]) {
    const putItems: Shift[] = [];
    for (const shift of shifts) {
      if (shift.savingTime !== SavingTime.DST) {
        continue;
      }

      // update shift start
      const newStart = new Date(shift.start);
      const oldStartStr = toDateString(newStart);
      newStart.setHours(newStart.getHours() - 1);
      const newStartStr = toDateString(newStart);

      // update shift end
      const newEnd = new Date(shift.end);
      newEnd.setHours(newEnd.getHours() - 1);

      const item: any = {
        ...shift,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        savingTime: SavingTime.STD
      };

      // update shift excepts + endRepeat
      let exceptsParam: DocumentClient.DynamoDbSet;
      let excepts = shift.excepts?.values;
      if (oldStartStr !== newStartStr) {
        // means the DST timezone make start date - 1, we should update excepts and endRepeat - 1 day too
        if (excepts?.length > 0) {
          excepts = excepts.map((dateStr) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() - 1);
            return toDateString(d);
          });
          exceptsParam = dynamoDBService.dbClient.createSet(excepts);
        }

        // update endRepeat
        if (shift.endRepeat) {
          const d = new Date(shift.endRepeat);
          d.setDate(d.getDate() - 1);
          const endRepeatParam = toDateString(d);
          item.endRepeat = endRepeatParam;
        }
      } else if (excepts?.length > 0) {
        exceptsParam = dynamoDBService.dbClient.createSet(excepts);
      }

      if (exceptsParam) {
        item.excepts = exceptsParam;
      }

      putItems.push(item);
    }

    if (putItems.length > 0) {
      await dynamoDBService.batchPut(API_SITWITHME_SHIFTTABLE_NAME, putItems);
    }
    return putItems;
  }

  async adjustShiftsToDST(shifts: Shift[]) {
    const putItems = [];
    for (const shift of shifts) {
      if (shift.savingTime !== SavingTime.STD) {
        continue;
      }

      // update shift start
      const newStart = new Date(shift.start);
      const oldStartStr = toDateString(newStart);
      newStart.setHours(newStart.getHours() + 1);
      const newStartStr = toDateString(newStart);

      // update shift end
      const newEnd = new Date(shift.end);
      newEnd.setHours(newEnd.getHours() + 1);

      const item: any = {
        ...shift,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        savingTime: SavingTime.DST
      };

      // update shift excepts + endRepeat
      let exceptsParam: DocumentClient.DynamoDbSet;
      let excepts = shift.excepts?.values;
      if (oldStartStr !== newStartStr) {
        // means the DST timezone make start date + 1, we should update excepts and endRepeat + 1 day too
        if (excepts?.length > 0) {
          excepts = excepts.map((dateStr) => {
            const d = new Date(dateStr);
            d.setDate(d.getDate() + 1);
            return toDateString(d);
          });
          exceptsParam = dynamoDBService.dbClient.createSet(excepts);
        }

        // update endRepeat
        if (shift.endRepeat) {
          const d = new Date(shift.endRepeat);
          d.setDate(d.getDate() + 1);
          const endRepeatParam = toDateString(d);
          item.endRepeat = endRepeatParam;
        }
      } else if (excepts?.length > 0) {
        exceptsParam = dynamoDBService.dbClient.createSet(excepts);
      }

      if (exceptsParam) {
        item.excepts = exceptsParam;
      }

      putItems.push(item);
    }

    if (putItems.length > 0) {
      await dynamoDBService.batchPut(API_SITWITHME_SHIFTTABLE_NAME, putItems);
    }
    return putItems;
  }

  async allShiftsBySavingTime(savingTime: SavingTime): Promise<Shift[]> {
    let shifts: Shift[] = [];
    const params = {
      TableName: API_SITWITHME_SHIFTTABLE_NAME,
      IndexName: 'bySavingTime',
      KeyConditionExpression: '#savingTime = :savingTime',
      ExpressionAttributeNames: {
        '#savingTime': 'savingTime'
      },
      ExpressionAttributeValues: {
        ':savingTime': savingTime
      }
    };
    const result = await dynamoDBService.queryAll(params);
    if (result.length) {
      shifts = result as Shift[];
    }

    return shifts;
  }

  getSavingTimeFromTZ(date: Date, ianaTz: string): SavingTime {
    if (ianaTz && tzHasDst(ianaTz)) {
      return isDstObserved(date, ianaTz) ? SavingTime.DST : SavingTime.STD;
    }
  }

  hasDST(shift: Shift): boolean {
    return shift.ianaTz && tzHasDst(shift.ianaTz);
  }

  adjustDateWithTz(date: Date | string, shift: Shift): Date {
    const d = new Date(date);
    if (this.hasDST(shift)) {
      const currentSavingTime = shift.savingTime;
      const editSavingTime = isDstObserved(d, shift.ianaTz) ? SavingTime.DST : SavingTime.STD;
      const offset = savingTimeOffset(shift.ianaTz);
      if (currentSavingTime === SavingTime.DST && editSavingTime === SavingTime.STD) {
        d.setMinutes(d.getMinutes() - offset);
      } else if (currentSavingTime === SavingTime.STD && editSavingTime === SavingTime.DST) {
        d.setMinutes(d.getMinutes() + offset);
      }
    }
    return d;
  }
}