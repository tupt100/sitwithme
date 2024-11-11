/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  API_SITWITHME_WORKPLACETABLE_ARN
  API_SITWITHME_WORKPLACETABLE_NAME
  API_SITWITHME_JOBTABLE_ARN
  API_SITWITHME_JOBTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { UserRole } from '@swm-core/interfaces/profile.interface';
import { OnboardingService } from '@swm-core/services/onboarding.service';
import { UserService } from '@swm-core/services/user.service';

const onboardingService = new OnboardingService();
const userService = new UserService();

const resolvers = {
  Mutation: {
    onboardingPatron: async (event) => {
      const input = event.arguments.input;
      const userID = event.identity.claims["custom:id"];
      // Set lastSeat is Patron for next login session
      await userService.update({ lastSeat: UserRole.PATRON }, { userId: userID });
      return await onboardingService.onboardingPatron(userID, input?.avatar, input?.userLocation);
    },

    onboardingStaff: async (event) => {
      const input = event.arguments.input;
      const userID = event.identity.claims["custom:id"];
      // Set lastSeat is Staff for next login session
      await userService.update({ lastSeat: UserRole.STAFF }, { userId: userID });
      return await onboardingService.onboardingStaff(userID, input?.avatar, input?.userLocation, input?.shift);
    },

    onboardingStaffV2: async (event) => {
      const input = event.arguments.input;
      const userID = event.identity.claims["custom:id"];
      // Set lastSeat is Staff for next login session
      await userService.update({ lastSeat: UserRole.STAFF }, { userId: userID });
      return await onboardingService.onboardingStaffV2(userID, input?.avatar, input?.userLocation, input?.shift, input?.paymentLinks);
    }
  },
};

exports.handler = async (event) => {
  console.info('Event: ', event);
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
