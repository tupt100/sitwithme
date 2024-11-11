/* Amplify Params - DO NOT EDIT
  API_SITWITHME_FOLLOWINGTABLE_ARN
  API_SITWITHME_FOLLOWINGTABLE_NAME
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_JOBTABLE_ARN
  API_SITWITHME_JOBTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_SHIFTTABLE_ARN
  API_SITWITHME_SHIFTTABLE_NAME
  API_SITWITHME_SWMNOTIFICATIONTABLE_ARN
  API_SITWITHME_SWMNOTIFICATIONTABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { UnauthorizedException } from '@swm-core/exceptions/unauthorized.exception';
import { MemberShip, Profile } from '@swm-core/interfaces/profile.interface';
import { SavingTime, Shift, ShiftEvent } from '@swm-core/interfaces/shift.interface';
import { FollowingService } from '@swm-core/services/following.service';
import { NotificationService } from '@swm-core/services/notification.service';
import { ProfileService } from '@swm-core/services/profile.service';
import { ShiftService } from '@swm-core/services/shift.service';
import { getTzISOString, isDstObserved, savingTimeOffset, tzHasDst } from '@swm-core/utils/date.util';
import { hasAttr } from '@swm-core/utils/validation.util';

const shiftService = new ShiftService();
const profileService = new ProfileService();
const followingService = new FollowingService();
const notificationService = new NotificationService();

const resolvers = {
  Profile: {
    dutyStatus: async (event) => {
      const { source } = event;
      const date = event.arguments.date;
      return shiftService.checkDutyByProfile(source, new Date(date));
    },
    currentShift: async (event) => {
      const { yelpBusinessID } = event.arguments.input;
      const { source } = event;
      const profileID = source.id;
      const currentShift = await shiftService.getCurrentShiftByProfileIDAndYelpBusinessID(profileID, yelpBusinessID);
      return { item: currentShift };
    }
  },

  Venue: {
    profiles: async (event) => {
      const { source } = event;
      const userID: string = event.identity.claims['custom:id'];
      const existedProfile: Profile = await profileService.getPatronByUserID(userID);
      return shiftService.listNoneBlockedProfilesWorkingByYelpBusinessID(source.yelpBusinessID, existedProfile.id);
    }
  },

  Shift: {
    duty: async (event) => {
      const { source } = event;
      const date = event.arguments.date;
      // Normalize excepts because Shift's excepts retrieved from ctx.source will contains "values" only
      return shiftService.checkDuty(
        {
          ...source,
          excepts: {
            values: source.excepts || [],
          },
        },
        new Date(date)
      );
    },
  },

  Mutation: {
    createShift: async (event) => {
      const shiftInput = event.arguments.input;
      const userID: string = event.identity.claims['custom:id'];
      const existedProfile: Profile = await profileService.getStaffByUserID(userID);
      if (!existedProfile) {
        throw new BadRequestException('Profile is not existed');
      }
      return shiftService.create({ ...shiftInput, profileID: existedProfile.id }, shiftInput.tz || 0);
    },
    switchDuty: async (event) => {
      const userID: string = event.identity.claims['custom:id'];
      return shiftService.switchDuty(userID);
    },

    deleteShiftEventsInFuture: async (event) => {
      const { id, start } = event.arguments.input;
      const userID: string = event.identity.claims['custom:id'];
      const existedShift: Shift = await shiftService.get(id);
      if (!existedShift) {
        return true;
      }

      const existedProfile: Profile = await profileService.getStaffByUserID(userID);
      if (existedShift.profileID !== existedProfile?.id) {
        throw new UnauthorizedException();
      }
      const shiftEventStart = shiftService.adjustDateWithTz(start, existedShift);
      await shiftService.deleteShiftEventsInFuture({ shift: existedShift, start: shiftEventStart });

      // Notify to staff if there is no shifts upcoming
      try {
        const now = new Date();
        const hasShifts = await shiftService.hasShiftsUpcoming(existedProfile.id, now);
        if (!hasShifts) {
          await notificationService.createNoShiftsUpcomingNotif({
            recipientProfileID: existedProfile.id
          });
        }
      } catch (e) {
        console.log('[deleteShiftEventsInFuture] ERROR:', e);
      }

      return true;
    },

    deleteShiftEvent: async (event) => {
      const { id, start } = event.arguments.input;
      const userID: string = event.identity.claims['custom:id'];
      const existedShift: Shift = await shiftService.get(id);
      if (!existedShift) {
        return true;
      }

      const existedProfile: Profile = await profileService.getStaffByUserID(userID);
      if (existedShift.profileID !== existedProfile?.id) {
        throw new UnauthorizedException();
      }
      const shiftEventStart = shiftService.adjustDateWithTz(start, existedShift);
      await shiftService.deleteShiftEvent({ shift: existedShift, start: shiftEventStart });

      // Notify to staff if there is no shifts upcoming
      try {
        const now = new Date();
        const hasShifts = await shiftService.hasShiftsUpcoming(existedProfile.id, now);
        if (!hasShifts) {
          await notificationService.createNoShiftsUpcomingNotif({
            recipientProfileID: existedProfile.id
          });
        }
      } catch (e) {
        console.log('[deleteShiftEvent] ERROR:', e);
      }

      return true;
    },

    updateShiftEventsInFuture: async (event) => {
      const { shiftEvent, shift: input, tz } = event.arguments.input;
      const userID: string = event.identity.claims['custom:id'];
      const existedShift: Shift = await shiftService.get(shiftEvent.id);
      if (!existedShift) {
        return true;
      }

      const existedProfile: Profile = await profileService.getStaffByUserID(userID);
      if (existedShift.profileID !== existedProfile?.id) {
        throw new UnauthorizedException();
      }

      const shiftEventStart = shiftService.adjustDateWithTz(shiftEvent.start, existedShift);
      const rs = await shiftService.updateShiftEventsInFuture({ shift: existedShift, start: shiftEventStart }, input, tz || 0);

      // Notify to staff if there is no shifts upcoming
      try {
        const now = new Date();
        const hasShifts = await shiftService.hasShiftsUpcoming(existedProfile.id, now);
        if (!hasShifts) {
          await notificationService.createNoShiftsUpcomingNotif({
            recipientProfileID: existedProfile.id
          });
        }
      } catch (e) {
        console.log('[updateShiftEventsInFuture] ERROR:', e);
      }

      return rs;
    },

    updateShiftEvent: async (event) => {
      const { shiftEvent, shift: input, tz } = event.arguments.input;
      const userID: string = event.identity.claims['custom:id'];
      const existedShift: Shift = await shiftService.get(shiftEvent.id);
      if (!existedShift) {
        return true;
      }

      const existedProfile: Profile = await profileService.getStaffByUserID(userID);
      if (existedShift.profileID !== existedProfile?.id) {
        throw new UnauthorizedException();
      }

      const shiftEventStart = shiftService.adjustDateWithTz(shiftEvent.start, existedShift);
      const rs = await shiftService.updateShiftEvent({ shift: existedShift, start: shiftEventStart }, input, tz || 0);

      // Notify to staff if there is no shifts upcoming
      try {
        const now = new Date();
        const hasShifts = await shiftService.hasShiftsUpcoming(existedProfile.id, now);
        if (!hasShifts) {
          await notificationService.createNoShiftsUpcomingNotif({
            recipientProfileID: existedProfile.id
          });
        }
      } catch (e) {
        console.log('[updateShiftEvent] ERROR:', e);
      }

      return rs;
    }
  },

  Query: {
    listShiftEventsByDateRange: async (event) => {
      const input = event.arguments.input;
      const tz = input.tz || 0;

      // month range is: 1..12
      // tz in minutes
      const shiftEvents = await shiftService.listUserShiftEventsByDateRange(event.identity.claims['custom:id'], new Date(input.start), new Date(input.end), tz);
      return shiftEvents.map((shiftEvent) => {

        // convert to local ISO String
        for (const shift of shiftEvent.shifts) {
          let newTz = tz;
          if (shiftService.hasDST(shift)) {
            const offset = savingTimeOffset(shift.ianaTz);
            if (shift.savingTime === SavingTime.STD && isDstObserved(shift.start as Date, shift.ianaTz)) {
              newTz = tz + offset; // STD to DST timezone
            } else if (shift.savingTime === SavingTime.DST && !isDstObserved(shift.start as Date, shift.ianaTz)) {
              newTz = tz - offset; // DST to STD timezone
            }
          }

          shift.start = getTzISOString(shift.start as Date, newTz);
          shift.end = getTzISOString(shift.end as Date, newTz);
        }

        return shiftEvent;
      });
    },

    listStaffShiftEvents: async (event) => {
      const input = event.arguments.input;
      const tz = input.tz || 0;

      const profile = await profileService.getPatronByUserID(event.identity.claims['custom:id']);
      if (!profile) {
        throw new BadRequestException('Patron is not existed');
      }
      const staff = await profileService.get(input.staffID);
      if (!staff) {
        throw new BadRequestException('Staff not found');
      }

      const following = await followingService.get(input.staffID, profile.id);

      // if this patron is premium + staff public privacy or following this staff => see shifts in 3 weeks
      // else
      // if this patron has connection => see shifts in this week
      let shiftEvents: ShiftEvent[] = [];
      switch (profile.memberShip) {
        case MemberShip.PREMIUM: {
          if (!staff.privacy || following?.confirmedAt) {
            shiftEvents = await shiftService.listStaffShiftEventsForPremium(input.staffID, tz);
          }
          break;
        }

        default: {
          // free patrons can see if staff privacy OFF
          // otherwise, free patrons need a connection to this staff
          if (!staff.privacy || following?.confirmedAt) {
            shiftEvents = await shiftService.listStaffShiftEventsForFree(input.staffID, tz);
          }

          break;
        }
      }

      return shiftEvents.map((shiftEvent) => {

        // convert to local ISO String
        for (const shift of shiftEvent.shifts) {
          let newTz = tz;
          if (shiftService.hasDST(shift)) {
            const offset = savingTimeOffset(shift.ianaTz);
            if (shift.savingTime === SavingTime.STD && isDstObserved(shift.start as Date, shift.ianaTz)) {
              newTz = tz + offset; // STD to DST timezone
            } else if (shift.savingTime === SavingTime.DST && isDstObserved(shift.start as Date, shift.ianaTz)) {
              newTz = tz - offset; // DST to STD timezone
            }
          }
          shift.start = getTzISOString(shift.start as Date, newTz);
          shift.end = getTzISOString(shift.end as Date, newTz);
        }

        return shiftEvent;
      });
    },

    getShiftEventDetail: async (event) => {
      const { id, start } = event.arguments.input;
      return shiftService.getShiftEventDetailByID({ id, start: new Date(start) });
    },

    getCurrentShiftEvent: async (event) => {
      const userID: string = event.identity.claims['custom:id'];
      return shiftService.getShiftEventAtDay(userID, new Date());
    }
  }
};

exports.handler = async (event) => {
  // event
  // {
  //   "typeName": "Query", /* Filled dynamically based on @function usage location */
  //   "fieldName": "me", /* Filled dynamically based on @function usage location */
  //   "arguments": { /* GraphQL field arguments via $ctx.arguments */ },
  //   "identity": { /* AppSync identity object via $ctx.identity */ },
  //   "source": { /* The object returned by the parent resolver. E.G. if resolving field 'Post.comments', the source is the Post object. */ },
  //   "request": { /* AppSync request object. Contains things like headers. */ },
  //   "prev": { /* If using the built-in pipeline resolver support, this contains the object returned by the previous function. */ },
  // }
  console.info('Event: ', JSON.stringify(event, null, 2));
  const typeHandler = resolvers[event.typeName];
  if (typeHandler) {
    try {
      const resolver = typeHandler[event.fieldName];
      if (resolver) {
        return await resolver(event);
      }
    } catch (e) {
      if (e instanceof PlatformException) {
        const { message, errCode, errors } = e;
        return { error: { message, errCode, errors } };
      } else {
        console.log('ERROR: ', e);
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
