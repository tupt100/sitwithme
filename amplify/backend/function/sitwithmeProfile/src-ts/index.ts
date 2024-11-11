/* Amplify Params - DO NOT EDIT
  API_SITWITHME_GRAPHQLAPIIDOUTPUT
  API_SITWITHME_PHOTOTABLE_ARN
  API_SITWITHME_PHOTOTABLE_NAME
  API_SITWITHME_POSTTABLE_ARN
  API_SITWITHME_POSTTABLE_NAME
  API_SITWITHME_PROFILERECENTVIEWTABLE_ARN
  API_SITWITHME_PROFILERECENTVIEWTABLE_NAME
  API_SITWITHME_PROFILETABLE_ARN
  API_SITWITHME_PROFILETABLE_NAME
  API_SITWITHME_USERTABLE_ARN
  API_SITWITHME_USERTABLE_NAME
  AUTH_SITWITHME_USERPOOLID
  ENV
  REGION
  ASSET_BASE_URL
Amplify Params - DO NOT EDIT */

import { BadRequestException } from '@swm-core/exceptions/bad-request.exception';
import { PlatformException } from '@swm-core/exceptions/platform.exception';
import { CognitoUpdateUserAttributes } from '@swm-core/interfaces/cognito.interface';
import { UpdateProfile } from '@swm-core/interfaces/profile.interface';
import { User } from '@swm-core/interfaces/user.interface';
import { PostService } from '@swm-core/services/post.service';
import { ProfileRecentViewService } from '@swm-core/services/profile-recent-view.service';
import { ProfileService } from '@swm-core/services/profile.service';

const profileService = new ProfileService();
const profileRecentViewService = new ProfileRecentViewService();
const postService = new PostService();

const resolvers = {
  Mutation: {
    createUserPhoto: (event) => {
      return postService.create(event.identity.claims["custom:id"], event.arguments.input);
    },

    deleteUserPhoto: async (event) => {
      const input = event.arguments.input;
      await postService.delete(input.id);
      return true;
    },

    updateProfile: (event) => {
      return updateProfile(event);
    },

    createStaffRecentView: async (event) => {
      await profileService.createStaffRecentView(event.identity.claims["custom:id"], event.arguments.input.staffID);
      return true;
    },

    createProfileRecentView: async (event) => {
      const { role, recentProfileID } = event.arguments.input;

      /////
      // Authorize and validation
      /////
      const userID = event.identity.claims["custom:id"];
      const profile = await profileService.getProfileByUserID(userID, role);
      if (!profile) {
        throw new BadRequestException('Profile not found.');
      }

      const recentProfile = await profileService.get(recentProfileID);
      if (!recentProfile) {
        throw new BadRequestException('Recent profile not found.');
      }
      if (recentProfile.role === role) {
        throw new BadRequestException('Profile cannot view other profile which has same role.');
      }

      // Exec
      await profileRecentViewService.createProfileRecentView(profile.id, recentProfileID);
      return true;
    },

    clearProfileRecentView: async (event: any) => {
      const { role } = event.arguments.input;

      /////
      // Authorize
      /////
      const userID = event.identity.claims["custom:id"];
      const profile = await profileService.getProfileByUserID(userID, role);
      if (!profile) {
        throw new BadRequestException('Profile not found.');
      }

      await profileRecentViewService.deleteAllRecentViewsByProfileID(profile.id);
      return true;
    },

    createExploreRecentSearch: async (event) => {
      await profileService.createExploreRecentSearch(event.identity.claims["custom:id"], event.arguments.input.keyword);
      return true;
    },

    createExploreRecentSearchV2: async (event) => {
      const { role, keyword } = event.arguments.input;
      await profileService.createExploreRecentSearchV2(event.identity.claims["custom:id"], role, keyword);
      return true;
    }
  },

  Query: {
    listStaffRecentViews: async (event) => {
      return profileService.listStaffRecentViews(event.identity.claims["custom:id"]);
    },

    listProfileRecentViews: async (event) => {
      const { role } = event.arguments.input;

      /////
      // Authorization
      /////
      const userID = event.identity.claims["custom:id"];
      const profile = await profileService.getProfileByUserID(userID, role);
      if (!profile) {
        throw new BadRequestException('Profile are not existed. Please switch seat or create new account.');
      }

      // Exec
      return profileRecentViewService.listProfileRecentViews(profile.id);
    }
  },
};

/**
 * Update profile will include updating user information
 * User information will affect to both User table and cognito
 */
async function updateProfile(event): Promise<User> {
  console.info('Starting update patron profile: ', event);
  const cognitoParams: CognitoUpdateUserAttributes = {
    userId: event.identity.claims['custom:id'],
    userName: event.identity.claims['cognito:username'],
    userPoolId: process.env.AUTH_SITWITHME_USERPOOLID,
  };
  const userInput: UpdateProfile = event.arguments.input;

  return profileService.updateProfile(userInput, cognitoParams);
}

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
