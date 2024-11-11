/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PROFILELEADERBOARDTABLE_ARN
  API_SITWITHME_PROFILELEADERBOARDTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_STAFFLEADERBOARDTABLE_ARN
  API_SITWITHME_STAFFLEADERBOARDTABLE_NAME
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { ProfileLeaderboardService } from '@swm-core/services/profile-leaderboard.service';
import { StaffLeaderboardService } from '@swm-core/services/staff-leaderboard.service';

const staffLeaderboardService = new StaffLeaderboardService();
const profileLeaderboardService = new ProfileLeaderboardService();

const resolvers = {
  Query: {
    listStaffsSortByConnectionCount: async(event) => {
      const { gsiHash, limit, sortDirection } = event.arguments;
      const userID: string = event.identity.claims["custom:id"]
      return staffLeaderboardService.listStaffsSortByConnectionCount(userID, { gsiHash }, limit);
    },

    listProfilesSortByConnectionCount: async(event) => {
      const { gsiHash, limit, sortDirection } = event.arguments;
      const userID: string = event.identity.claims["custom:id"]
      return profileLeaderboardService.listProfilesSortByConnectionCount(userID, { gsiHash }, limit);
    }
  }
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
        return { error: { message, errCode, errors }};
      } else {
        console.log('ERROR: ', e);
        throw new Error('Unknown Error. Please help contact support.');
      }
    }
  }
  throw new Error('Resolver not found.');
};
